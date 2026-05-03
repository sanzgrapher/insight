<?php

declare(strict_types=1);

namespace Doppar\Insight\Support;

use Phaseolies\Application;
use Phaseolies\Http\Request;
use Phaseolies\Http\Response;
use Phaseolies\Middleware\Contracts\Middleware as ContractsMiddleware;
use Phaseolies\Support\Router;
use Throwable;

class ProfilingRouter extends Router
{
    public function __construct(
        protected Router $router,
        protected ErrorHistoryRecorder $recorder
    ) {
        parent::__construct();

        // Mirror the current router state so framework code reading public
        // router properties still sees the active middleware configuration.
        $routerState = get_object_vars($router);

        if (array_key_exists('middleware', $routerState)) {
            $this->middleware = $router->middleware;
        }

        if (array_key_exists('middlewareGroups', $routerState)) {
            $this->middlewareGroups = $router->middlewareGroups;
        }

        if (array_key_exists('routeMiddleware', $routerState)) {
            $this->routeMiddleware = $router->routeMiddleware;
        }

        if (array_key_exists('start', $routerState)) {
            $this->start = $router->start;
        }
    }

    public function resolve(Application $app, Request $request): Response
    {
        try {
            return $this->router->resolve($app, $request);
        } catch (Throwable $exception) {
            $this->recorder->record($exception, $request);

            throw $exception;
        }
    }

    public function applyMiddleware(ContractsMiddleware $middleware, array|string $params = []): void
    {
        $this->router->applyMiddleware($middleware, $params);
        $this->start = $this->router->start;
    }

    public function handle(Request $request, \Closure $handler): Response
    {
        return $this->router->handle($request, $handler);
    }

    public function __call(string $name, array $arguments): mixed
    {
        return $this->router->{$name}(...$arguments);
    }
}
