<?php

declare(strict_types=1);

namespace Doppar\Insight\Tests\Mocks;

use Doppar\Insight\Contracts\StorageInterface;

/**
 * In-memory storage implementation for testing purposes
 */
class InMemoryStorage implements StorageInterface
{
    /**
     * @var array<string, array<string, mixed>>
     */
    private array $storage = [];

    public function put(string $id, array $data): void
    {
        $this->storage[$id] = $data;
    }

    public function get(string $id): ?array
    {
        return $this->storage[$id] ?? null;
    }

    public function recent(int $limit = 50): array
    {
        $profiles = array_reverse($this->storage, true);
        $profiles = array_slice($profiles, 0, max(1, $limit), true);

        return array_map(function (array $data, string $id): array {
            $route = (string) ($data['route'] ?? $data['request_server']['PATH'] ?? $data['url'] ?? '/');

            return [
                'id' => (string) ($data['id'] ?? $id),
                'method' => strtoupper((string) ($data['method'] ?? $data['request_server']['METHOD'] ?? 'GET')),
                'route' => $route !== '' ? $route : '/',
                'status' => (int) ($data['status'] ?? $data['response_status'] ?? 0),
                'duration_ms' => (float) ($data['total_duration_ms'] ?? $data['duration_ms'] ?? 0),
                'captured_at' => null,
                'captured_at_unix' => 0,
            ];
        }, $profiles, array_keys($profiles));
    }

    public function has(string $id): bool
    {
        return isset($this->storage[$id]);
    }

    public function clear(): void
    {
        $this->storage = [];
    }

    public function count(): int
    {
        return count($this->storage);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function all(): array
    {
        return $this->storage;
    }
}
