<?php

namespace Doppar\Insight\Contracts;

interface StorageInterface
{
    /**
     * Persist a request profile by id
     * @param string $id
     * @param array<string,mixed> $data
     */
    public function put(string $id, array $data): void;

    /**
     * Retrieve a stored profile or null
     * @return array<string,mixed>|null
     */
    public function get(string $id): ?array;

    /**
     * Retrieve recent profile summaries ordered newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function recent(int $limit = 50): array;
}
