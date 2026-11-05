<?php

namespace App\Modules\Catalogs\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Modules\Catalogs\Http\Requests\CatalogIndexRequest;
use App\Modules\Catalogs\Http\Resources\DocumentProcessResource;
use App\Modules\Catalogs\Queries\PublicCatalogQuery;
use App\Shared\Http\PaginatedResourceResponse;
use Illuminate\Http\JsonResponse;

class DocumentProcessController extends Controller
{
    public function index(CatalogIndexRequest $request, PublicCatalogQuery $query): JsonResponse
    {
        return PaginatedResourceResponse::make(
            $query->paginateProcesses($request->validated()),
            DocumentProcessResource::class,
            $request,
        );
    }

    public function show(int $process, PublicCatalogQuery $query): JsonResponse
    {
        $item = $query->findProcess($process);
        abort_if($item === null, 404);

        return (new DocumentProcessResource($item))->response();
    }
}
