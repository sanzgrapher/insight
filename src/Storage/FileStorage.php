<?php

declare(strict_types=1);

namespace Doppar\Insight\Storage;

use Doppar\Insight\Contracts\StorageInterface;
use JsonException;

class FileStorage implements StorageInterface
{
    private int $lastCleanupTime = 0;
    private const CLEANUP_INTERVAL = 86400; // Run cleanup every day
    private const SECONDS_PER_DAY = 86400;

    protected string $baseDir;

    public function __construct(
        ?string $baseDir = null,
        private readonly int $retentionDays = 1
    ) {
        $this->baseDir = $baseDir ?? rtrim(storage_path('framework/profiler'), DIRECTORY_SEPARATOR);
    }

    protected function dir(): string
    {
        return $this->baseDir;
    }

    public function put(string $id, array $data): void
    {
        $dir = $this->dir();

        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $path = $dir . DIRECTORY_SEPARATOR . $id . '.json';
        file_put_contents($path, json_encode($data, JSON_THROW_ON_ERROR));

        $this->cleanupOldFiles();
    }

    public function get(string $id): ?array
    {
        $path = $this->dir() . DIRECTORY_SEPARATOR . $id . '.json';

        if (! is_file($path)) {
            return null;
        }

        return $this->decodeFile($path);
    }

    public function recent(int $limit = 50): array
    {
        $dir = $this->dir();

        if (! is_dir($dir)) {
            return [];
        }

        $files = glob($dir . DIRECTORY_SEPARATOR . '*.json') ?: [];
        $limit = max(1, $limit);
        $profiles = [];

        foreach ($files as $file) {
            $data = $this->decodeFile($file);
            if (! is_array($data)) {
                continue;
            }

            $profiles[] = $this->summarizeProfile($file, $data);
        }

        usort($profiles, function (array $left, array $right): int {
            $leftTimestamp = (int) ($left['captured_at_unix'] ?? 0);
            $rightTimestamp = (int) ($right['captured_at_unix'] ?? 0);

            return $rightTimestamp <=> $leftTimestamp;
        });

        return array_slice($profiles, 0, $limit);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeFile(string $path): ?array
    {
        $json = file_get_contents($path);

        if ($json === false) {
            return null;
        }

        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

            return is_array($data) ? $data : null;
        } catch (JsonException) {
            return null;
        }
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function summarizeProfile(string $path, array $data): array
    {
        $timestamp = $this->resolveTimestamp($path, $data);
        $route = (string) ($data['route'] ?? $data['request_server']['PATH'] ?? $data['url'] ?? '/');
        $method = strtoupper((string) ($data['method'] ?? $data['request_server']['METHOD'] ?? 'GET'));

        if ($route === '') {
            $route = '/';
        }

        return [
            'id' => (string) ($data['id'] ?? pathinfo($path, PATHINFO_FILENAME)),
            'method' => $method !== '' ? $method : 'GET',
            'route' => $route,
            'status' => (int) ($data['status'] ?? $data['response_status'] ?? 0),
            'duration_ms' => (float) ($data['total_duration_ms'] ?? $data['duration_ms'] ?? 0),
            'exception_class' => isset($data['exception_class']) ? (string) $data['exception_class'] : null,
            'exception_message' => isset($data['exception_message']) ? (string) $data['exception_message'] : null,
            'captured_at' => $timestamp > 0 ? gmdate(DATE_ATOM, $timestamp) : null,
            'captured_at_unix' => $timestamp,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function resolveTimestamp(string $path, array $data): int
    {
        $timeStart = $data['time_start'] ?? null;

        if (is_numeric($timeStart)) {
            return (int) floor((float) $timeStart);
        }

        return $this->fileTimestamp($path);
    }

    private function fileTimestamp(string $path): int
    {
        $timestamp = filemtime($path);

        return $timestamp !== false ? $timestamp : 0;
    }

    /**
     * Clean up JSON files older than the retention period.
     * Only runs once per cleanup interval to avoid performance impact.
     */
    private function cleanupOldFiles(): void
    {
        $now = time();

        if ($now - $this->lastCleanupTime < self::CLEANUP_INTERVAL) {
            return;
        }

        $this->lastCleanupTime = $now;
        $dir = $this->dir();

        if (! is_dir($dir)) {
            return;
        }

        $cutoffTime = $now - ($this->retentionDays * self::SECONDS_PER_DAY);
        $files = glob($dir . DIRECTORY_SEPARATOR . '*.json') ?: [];

        foreach ($files as $file) {
            $mtime = filemtime($file);

            if ($mtime !== false && $mtime < $cutoffTime) {
                unlink($file);
            }
        }
    }
}
