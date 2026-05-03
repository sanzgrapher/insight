<?php

declare(strict_types=1);

namespace Doppar\Insight\Tests\Cache;

use Doppar\Insight\Cache\ProfilerCacheStore;
use Doppar\Insight\Collectors\CacheCollector;
use Doppar\Insight\Tests\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;

class ProfilerCacheStoreTest extends TestCase
{
    private CacheCollector $collector;

    private ProfilerCacheStore $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->collector = new CacheCollector();
        $this->collector->start($this->createRequest());
        $this->store = new ProfilerCacheStore(new ArrayAdapter(), 'test_', 'array', 'array');
    }

    protected function tearDown(): void
    {
        CacheCollector::setActive(null);
        parent::tearDown();
    }

    public function testSetCapturesStoreAndTtlMetadata(): void
    {
        $this->store->set('profile', ['name' => 'Taylor'], 120);

        $data = $this->collector->toArray();
        $operation = $data['cache_operations'][0];

        $this->assertSame('set', $operation['type']);
        $this->assertSame('array', $operation['store_name']);
        $this->assertSame('array', $operation['store_driver']);
        $this->assertSame(120, $operation['ttl_seconds']);
        $this->assertNotNull($operation['expires_at']);
    }

    public function testLockLifecycleIsCaptured(): void
    {
        $lock = $this->store->locked('insight_sync', 5, 'owner-1');

        $this->assertTrue($lock->get());
        $this->assertTrue($lock->release());

        $data = $this->collector->toArray();
        $types = array_column($data['cache_operations'], 'type');

        $this->assertContains('lock_prepare', $types);
        $this->assertContains('lock_get', $types);
        $this->assertContains('lock_release', $types);
        $this->assertGreaterThanOrEqual(3, $data['cache_lock_operations']);
    }
}
