<?php

namespace Doppar\Insight\Collectors;

use Doppar\Insight\Contracts\CollectorInterface;
use Phaseolies\Http\Request;
use Phaseolies\Http\Response;

class ResponseCollector implements CollectorInterface
{
    /** @var array<string, mixed> */
    protected array $data = [];

    public function name(): string
    {
        return 'response';
    }

    public function start(Request $request): void
    {
        // Nothing to collect at start for response
    }

    public function stop(Request $request, Response $response): void
    {
        // Collect response headers
        $headers = [];
        $headers = $response->headers->all();

        // Collect response info
        $statusCode = $response->getStatusCode();
        $contentType = $this->resolveContentType($request, $response);

        // Detect redirects
        $isRedirect = $response->isRedirection();
        $redirectUrl = $isRedirect ? ($response->headers->get('Location') ?? '') : '';

        // Collect response body info (without the actual content for performance)
        $bodySize = 0;
        if (isset($response->body)) {
            $bodySize = strlen($response->body ?? '');
        }

        $this->data = [
            'response_headers' => $headers,
            'response_status' => $statusCode,
            'response_content_type' => $contentType,
            'response_body_size' => $bodySize,
            'is_redirect' => $isRedirect,
            'redirect_url' => $redirectUrl,
        ];
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
