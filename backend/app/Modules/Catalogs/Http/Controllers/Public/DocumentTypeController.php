<?php

namespace App\Modules\Catalogs\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Modules\Catalogs\Http\Requests\CatalogIndexRequest;
use App\Modules\Catalogs\Http\Resources\DocumentTypeResource;
use App\Modules\Catalogs\Queries\PublicCatalogQuery;
use App\Shared\Http\PaginatedResourceResponse;
use Illuminate\Http\JsonResponse;

class DocumentTypeController extends Controller
{
    public function index(CatalogIndexRequest $request, PublicCatalogQuery $query): JsonResponse
    {
        return PaginatedResourceResponse::make(
            $query->paginateDocumentTypes($request->validated()),
            DocumentTypeResource::class,
            $request,
        );
    }

    public function show(int $documentType, PublicCatalogQuery $query): JsonResponse
    {
        $type = $query->findDocumentType($documentType);
        abort_if($type === null, 404);

        return (new DocumentTypeResource($type))->response();
    }
}
