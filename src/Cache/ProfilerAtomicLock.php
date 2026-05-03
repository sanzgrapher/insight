<?php

namespace Doppar\Insight\Cache;

use Doppar\Insight\Collectors\CacheCollector;
use Phaseolies\Cache\CacheStore;
use Phaseolies\Cache\Lock\AtomicLock;

class ProfilerAtomicLock extends AtomicLock
{
    public static function fromExisting(CacheStore $store, AtomicLock $lock): self
    {
        $wrapper = new self($store, $lock->getName(), $lock->getSeconds(), $lock->getOwner(), $lock->isRestored());

        if ($lock->isOwned()) {
            $wrapper->setOwned();
        }

        return $wrapper;
    }

    public function get(): bool
    {
        $result = parent::get();
        $this->recordLockOperation('lock_get', $result, [
            'lock_action' => 'acquire',
        ]);

        return $result;
    }

    public function block(int $seconds): bool
    {
        $startedAt = microtime(true);
        $result = parent::block($seconds);

        $this->recordLockOperation('lock_block', $result, [
            'lock_action' => 'block',
            'lock_wait_seconds' => $seconds,
            'lock_wait_duration_ms' => (microtime(true) - $startedAt) * 1000,
        ]);

        return $result;
    }

    public function release(): bool
    {
        $result = parent::release();
        $this->recordLockOperation('lock_release', $result, [
            'lock_action' => 'release',
        ]);

        return $result;
    }

    /**
     * @param array<string, mixed> $meta
     */
    protected function recordLockOperation(string $type, bool $result, array $meta = []): void
    {
        $collector = CacheCollector::active();
        if (! $collector) {
            return;
        }

        $remaining = null;
        try {
            $remaining = $this->getRemainingTime();
        } catch (\Throwable) {
            $remaining = null;
        }

        $collector->registerOperation($type, $this->getName(), null, $result, array_merge([
            'lock_name' => $this->getName(),
            'lock_owner' => $this->getOwner(),
            'lock_seconds' => $this->getSeconds(),
            'lock_restored' => $this->isRestored(),
            'lock_owned' => $this->isOwned(),
            'lock_remaining_seconds' => $remaining,
            'store_name' => method_exists($this->store, 'getStoreName') ? $this->store->getStoreName() : null,
            'store_driver' => method_exists($this->store, 'getStoreDriver') ? $this->store->getStoreDriver() : null,
        ], $meta));
    }
}
