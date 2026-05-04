<?php

declare(strict_types=1);

namespace Doppar\Insight\Tests;

use Doppar\Insight\Collectors\HttpCollector;
use Doppar\Insight\Collectors\RequestCollector;
use Doppar\Insight\Collectors\ResponseCollector;
use Doppar\Insight\Collectors\TimeMemoryCollector;
use Doppar\Insight\Contracts\StorageInterface;
use Doppar\Insight\Profiler;
use Phaseolies\Http\Exceptions\NotFoundHttpException;

class ProfilerExceptionCaptureTest extends TestCase
{
    public function testStopWithExceptionPersistsHttpExceptionStatusAndRequestData(): void
    {
        $storage = $this->createStorage();
        $profiler = new Profiler(['enabled' => true], $storage);
        $profiler->addCollector(new HttpCollector());
        $profiler->addCollector(new RequestCollector());
        $profiler->addCollector(new ResponseCollector());
        $profiler->addCollector(new TimeMemoryCollector());

        $request = $this->createRequest('GET', '/missing-page', ['REMOTE_ADDR' => '127.0.0.1']);

        $profiler->start($request);
        $profiler->stopWithException($request, new NotFoundHttpException('Route missing'));

        $recent = $storage->recent();

        $this->assertCount(1, $recent);
        $this->assertSame(404, $recent[0]['status']);
        $this->assertSame('/missing-page', $recent[0]['route']);
        $this->assertSame('GET', $recent[0]['method']);
        $this->assertSame(NotFoundHttpException::class, $recent[0]['exception_class']);
        $this->assertNotEmpty($recent[0]['id']);

        $stored = $storage->get($recent[0]['id']);

        $this->assertSame(404, $stored['status']);
        $this->assertSame(NotFoundHttpException::class, $stored['exception_class']);
        $this->assertSame('Route missing', $stored['exception_message']);
        $this->assertSame('/missing-page', $stored['route']);
    }

    public function testStopWithExceptionDefaultsGenericThrowableTo500(): void
    {
        $storage = $this->createStorage();
        $profiler = new Profiler(['enabled' => true], $storage);
        $profiler->addCollector(new HttpCollector());
        $profiler->addCollector(new ResponseCollector());
        $profiler->addCollector(new TimeMemoryCollector());

        $request = $this->createRequest('POST', '/explode', ['REMOTE_ADDR' => '127.0.0.1']);

        $profiler->start($request);
        $profiler->stopWithException($request, new \RuntimeException('Boom'));

        $recent = $storage->recent();

        $this->assertCount(1, $recent);
        $this->assertSame(500, $recent[0]['status']);

        $stored = $storage->get($recent[0]['id']);

        $this->assertSame(500, $stored['status']);
        $this->assertSame(\RuntimeException::class, $stored['exception_class']);
        $this->assertSame('Boom', $stored['exception_message']);
    }

    private function createStorage(): StorageInterface
    {
        return new class implements StorageInterface
        {
            /** @var array<string, array<string, mixed>> */
            public array $records = [];

            public function put(string $id, array $data): void
            {
                $this->records[$id] = $data;
            }

            public function get(string $id): ?array
            {
                return $this->records[$id] ?? null;
            }

            public function recent(int $limit = 50): array
            {
                return array_slice(array_values(array_map(function (array $data): array {
                    return [
                        'id' => $data['id'],
                        'method' => $data['method'],
                        'route' => $data['route'],
                        'status' => $data['status'],
                        'duration_ms' => $data['duration_ms'] ?? 0,
                        'exception_class' => $data['exception_class'] ?? null,
                        'exception_message' => $data['exception_message'] ?? null,
                        'captured_at' => null,
                        'captured_at_unix' => 0,
                    ];
                }, $this->records)), 0, $limit);
            }
        };
    }
}
