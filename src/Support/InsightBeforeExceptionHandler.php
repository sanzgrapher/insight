<?php

declare(strict_types=1);

namespace Doppar\Insight\Support;

use Phaseolies\Error\Contracts\ErrorHandlerInterface;
use Throwable;

class InsightBeforeExceptionHandler implements ErrorHandlerInterface
{
    public function handle(Throwable $exception): void
    {
        app(ErrorHistoryRecorder::class)->record($exception);
    }

    public function supports(): bool
    {
        return true;
    }
}
