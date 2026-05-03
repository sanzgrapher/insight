<?php

use Phaseolies\Http\Request;
use Doppar\Insight\Profiler;
use Doppar\Insight\Controllers\ProfilerController;

$router = app('route');

// API endpoint for recent request summaries
$router->get('/_insight/api/history', function (Request $request) {
    /** @var Profiler $profiler */
    $profiler = app(Profiler::class);

    if (! $profiler->isEnabledFor($request)) {
        return response()->json(['error' => 'Forbidden'], 403);
    }

    $limit = (int) $request->query('limit', 300);
    $limit = max(1, min($limit, 1000));

    return response()->json($profiler->getRecentRequests($limit), 200);
});

// API endpoint for JSON data (used by toolbar panel)
$router->get('/_insight/api/{id}', function (Request $request) {
    /** @var Profiler $profiler */
    $profiler = app(Profiler::class);

    // Extra guard: only serve when globally enabled and IP allowed
    if (! $profiler->isEnabledFor($request)) {
        return response()->json(['error' => 'Forbidden'], 403);
    }

    $params = $request->getRouteParams();
    $id = $params['id'] ?? null;
    $data = $id ? $profiler->getData($id) : null;

    if (! $data) {
        return response()->json(['error' => 'Not found'], 404);
    }

    return response()->json($data, 200);
});

// Full details page with tabs
$router->get('/_insight/{id}', [ProfilerController::class, 'show']);
