<?php

namespace App\Shared\Http;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaginatedResourceResponse
{
    /**
     * @param  class-string<JsonResource>  $resourceClass
     */
    public static function make(
        LengthAwarePaginator $paginator,
        string $resourceClass,
        Request $request
    ): JsonResponse {
        $data = collect($paginator->items())
            ->map(fn (mixed $item): array => (new $resourceClass($item))->resolve($request))
            ->values()
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'paginaActual' => $paginator->currentPage(),
                'desde' => $paginator->firstItem(),
                'hasta' => $paginator->lastItem(),
                'ultimaPagina' => $paginator->lastPage(),
                'porPagina' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'links' => [
                'primera' => self::pageUrl($request, 1),
                'ultima' => self::pageUrl($request, $paginator->lastPage()),
                'anterior' => $paginator->currentPage() > 1
                    ? self::pageUrl($request, $paginator->currentPage() - 1)
                    : null,
                'siguiente' => $paginator->hasMorePages()
                    ? self::pageUrl($request, $paginator->currentPage() + 1)
                    : null,
            ],
        ]);
    }

    private static function pageUrl(Request $request, int $page): string
    {
        $prefix = '/'.trim((string) config('public_api.prefix', '/resources'), '/');
        $query = $request->query();
        $query['pagina'] = $page;

        return $prefix.'/'.ltrim($request->path(), '/').'?'.http_build_query($query);
    }
}
