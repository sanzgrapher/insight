<?php

declare(strict_types=1);

namespace Doppar\Insight\Tests\Middleware;

use Doppar\Insight\Middleware\ProfilerMiddleware;
use Doppar\Insight\Profiler;
use Doppar\Insight\Tests\TestCase;
use Phaseolies\DI\Container;

class ProfilerMiddlewareTest extends TestCase
{
    protected function tearDown(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];
        Container::forgetInstance();

        parent::tearDown();
    }

    public function testHtmlInjectionDoesNotStartSessionWhenNoRedirectChainExists(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];

        $container = new Container();
        $container->instance(Profiler::class, new class
        {
            public function isEnabledFor($request): bool
            {
                return true;
            }

            public function start($request): void
            {
            }

            public function stop($request, $response): void
            {
            }

            public function shouldInject($response): bool
            {
                return true;
            }

            public function renderToolbar(): string
            {
                return '<div id="insight-toolbar"></div>';
            }
        });
        Container::setInstance($container);

        $middleware = new ProfilerMiddleware();
        $request = $this->createRequest('GET', '/home');
        $response = $this->createResponse(200, 'text/html', '<html><body>Hello</body></html>');

        $result = $middleware($request, fn () => $response);

        $this->assertSame(PHP_SESSION_NONE, session_status());
        $this->assertStringContainsString('<div id="insight-toolbar"></div></body>', (string) $result->body);
    }
}
