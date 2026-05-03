<?php

declare(strict_types=1);

namespace Doppar\Insight\Support;

use Doppar\Insight\Profiler;
use Phaseolies\Http\Request;
use Throwable;

class ErrorHistoryRecorder
{
    public function record(Throwable $exception, ?Request $request = null): void
    {
        try {
            $container = app();

            if (! method_exists($container, 'getBindings')) {
                return;
            }

            $bindings = $container->getBindings();
            if (! isset($bindings[Profiler::class])) {
                return;
            }

            $request ??= $this->resolveRequest();
            if (! $request instanceof Request) {
                return;
            }

            $path = $request->getPath();
            if ($path !== '' && str_starts_with($path, '/_insight')) {
                return;
            }

            /** @var Profiler $profiler */
            $profiler = app(Profiler::class);

            if (! $profiler->isEnabledFor($request) || $profiler->hasStopped()) {
                return;
            }

            if (! $profiler->isRunning()) {
                $profiler->start($request);
            }

            $profiler->stopWithException($request, $exception);
        } catch (Throwable) {
            // Error tracking must never interfere with the normal exception flow.
        }
    }

    protected function resolveRequest(): ?Request
    {
        try {
            $request = app('request');

            return $request instanceof Request ? $request : null;
        } catch (Throwable) {
            return null;
        }
    }
}
