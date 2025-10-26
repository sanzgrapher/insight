<?php

namespace Doppar\Insight\Collectors;

use Doppar\Insight\Contracts\CollectorInterface;
use Phaseolies\Http\Request;
use Phaseolies\Http\Response;
use Phaseolies\Support\Facades\Cache;

class CacheCollector implements CollectorInterface
{
    /** @var array<int, array<string, mixed>> */
    protected array $operations = [];
    protected static ?self $active = null;

    public static function setActive(?self $collector): void
    {
        self::$active = $collector;
    }

    public static function active(): ?self
    {
        return self::$active;
    }

    public function name(): string
    {
        return 'cache';
    }

    public function start(Request $request): void
    {
        $this->operations = [];
        self::setActive($this);
    }

    public function stop(Request $request, Response $response): void
    {
        self::setActive(null);
    }

    /**
     * Register a cache operation
     */
    public function registerOperation(string $type, string $key, mixed $value = null, bool $hit = false): void
    {
        $normalized = $this->normalizedForJson($value);
        $valueJson = null;
        if ($normalized !== null) {
            $encoded = json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $valueJson = $encoded === false ? null : (strlen($encoded) > 10000 ? substr($encoded, 0, 10000) . "\n… (truncated)" : $encoded);
        }

        $this->operations[] = [
            'type' => $type,
            'key' => $key,
            'value' => $this->formatValue($value),
            'value_json' => $valueJson,
            'hit' => $hit,
            'time' => microtime(true),
        ];
    }

    protected function formatValue(mixed $value): mixed
    {
        // Strings: truncate to avoid huge payloads in UI
        if (is_string($value)) {
            return strlen($value) > 2000 ? substr($value, 0, 2000) . '…' : $value;
        }

        // Arrays/objects: try to JSON encode similar to session details
        if (is_array($value) || is_object($value)) {
            $normalized = $this->normalizedForJson($value);
            if ($normalized === null) {
                return '[object ' . (is_object($value) ? get_class($value) : 'array') . ']';
            }
            $json = json_encode($normalized, JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                return '[object ' . (is_object($value) ? get_class($value) : 'array') . ']';
            }
            // Provide a compact single-line preview (trim if huge)
            if (is_object($value) && \is_a($value, '\\Phaseolies\\Support\\Collection')) {
                // Specialized preview for collections
                $count = $value->count();
                $first = null;

                try {
                    $first = $value->first();
                } catch (\Throwable) {
                    $first = null;
                }
                $model = is_object($first) ? get_class($first) : 'unknown';
                $preview = "Collection(" . $model . ")[" . $count . "]";

                return $preview;
            }

            $preview = strlen($json) > 2000 ? substr($json, 0, 2000) . '…' : $json;

            return $preview;
        }

        return $value;
    }

    /**
     * Normalize mixed value into array/scalar suitable for JSON UI rendering.
     */
    protected function normalizedForJson(mixed $value): mixed
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_object($value)) {
            // Show framework collections with metadata for better UX in UI
            if (\is_a($value, '\\Phaseolies\\Support\\Collection')) {
                $first = null;

                try {
                    $first = $value->first();
                } catch (\Throwable) {
                    $first = null;
                }
                $model = is_object($first) ? get_class($first) : null;
                $dataArr = $value->toArray();
                $count = $value->count();

                return [
                    '__type' => 'collection',
                    'model' => $model,
                    'count' => $count,
                    'data' => $dataArr,
                ];
            }
            if (method_exists($value, 'toArray')) {
                try {
                    return $value->toArray();
                } catch (\Throwable) { /* ignore */
                }
            }
            if ($value instanceof \JsonSerializable) {
                try {
                    return $value->jsonSerialize();
                } catch (\Throwable) { /* ignore */
                }
            }
            if ($value instanceof \Traversable) {
                try {
                    return iterator_to_array($value);
                } catch (\Throwable) { /* ignore */
                }
            }

            // Fallback: expose public props, may be empty
            return (array) $value;
        }

        // Scalars not needed as JSON blocks
        return null;
    }

    public function toArray(): array
    {
        $hits = 0;
        $misses = 0;
        $writes = 0;
        $deletes = 0;

        foreach ($this->operations as $op) {
            match ($op['type']) {
                'get' => $op['hit'] ? $hits++ : $misses++,
                'set', 'forever' => $writes++,
                'delete', 'forget' => $deletes++,
                default => null,
            };
        }

        return [
            'cache_operations' => $this->operations,
            'cache_hits' => $hits,
            'cache_misses' => $misses,
            'cache_writes' => $writes,
            'cache_deletes' => $deletes,
            'cache_total' => count($this->operations),
        ];
    }
}
