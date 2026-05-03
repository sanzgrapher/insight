<?php

namespace Doppar\Insight\Collectors;

use Doppar\Insight\Contracts\CollectorInterface;
use Phaseolies\Http\Request;
use Phaseolies\Http\Response;

class HttpCollector implements CollectorInterface
{
    /** @var array<string, mixed> */
    protected array $data = [];

    public function name(): string
    {
        return 'http';
    }

    public function start(Request $request): void
    {
        $this->data = [
            'method' => $request->getMethod(),
            'route' => $request->getPath(),
            'ip' => $request->ip(),
            'url' => $request->getRequestUri(),
        ];
    }

    public function stop(Request $request, Response $response): void
    {
        $this->data['status'] = $response->getStatusCode();
        $this->data['content_type'] = $this->resolveContentType($request, $response);

        // Detect redirects (3xx status codes)
        $status = $response->getStatusCode();
        if ($status >= 300 && $status < 400) {
            $this->data['is_redirect'] = true;
            $this->data['redirect_url'] = $response->headers->get('Location') ?? '';
        } else {
            $this->data['is_redirect'] = false;
        }
    }

    public function toArray(): array
    {
        return $this->data;
    }

    protected function resolveContentType(Request $request, Response $response): string
    {
        $contentType = $response->headers->get('Content-Type') ?? '';
        if ($contentType !== '') {
            return $contentType;
        }

        if ($response->isInformational() || $response->isEmpty()) {
            return '';
        }

        $format = $request->getRequestFormat(null);
        if ($format !== null) {
            $mimeType = $request->getMimeType($format);
            if (is_string($mimeType) && $mimeType !== '') {
                if (stripos($mimeType, 'text/') === 0 && stripos($mimeType, 'charset') === false) {
                    return $mimeType . '; charset=UTF-8';
                }

                return $mimeType;
            }
        }

        return 'text/html; charset=UTF-8';
    }
}
