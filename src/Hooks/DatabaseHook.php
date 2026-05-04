<?php

namespace Doppar\Insight\Hooks;

use Doppar\Insight\Contracts\ProfilerHookInterface;
use Doppar\Insight\Profiler;
use Phaseolies\Application;

/**
 * Hook to intercept PDO statements for SQL profiling
 */
class DatabaseHook implements ProfilerHookInterface
{
    public function register(Application $app, Profiler $profiler): void
    {
        try {
            // Install PDO statement class hook to capture SQL timings
            $defaultConnection = (string) config('database.default', 'default');
            $defaultPdo = \Phaseolies\Database\Database::getPdoInstance($defaultConnection);
            $defaultPdo->setAttribute(\PDO::ATTR_STATEMENT_CLASS, [
                \Doppar\Insight\DB\ProfilerPdoStatement::class,
                [$defaultConnection, (string) $defaultPdo->getAttribute(\PDO::ATTR_DRIVER_NAME)],
            ]);

            // Hook all configured database connections
            $connections = config('database.connections') ?? [];
            if (is_array($connections)) {
                foreach (array_keys($connections) as $name) {
                    try {
                        $pdo = \Phaseolies\Database\Database::getPdoInstance($name);
                        $pdo->setAttribute(\PDO::ATTR_STATEMENT_CLASS, [
                            \Doppar\Insight\DB\ProfilerPdoStatement::class,
                            [(string) $name, (string) $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)],
                        ]);
                    } catch (\Throwable) {
                        // Ignore per-connection errors
                    }
                }
            }
        } catch (\Throwable) {
            // Silently fail if DB not configured or not reachable
        }
    }
}
