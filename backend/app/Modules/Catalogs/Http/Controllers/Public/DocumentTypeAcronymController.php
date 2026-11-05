<?php

namespace App\Modules\Catalogs\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Modules\Catalogs\Http\Requests\CatalogIndexRequest;
use App\Modules\Catalogs\Http\Resources\DocumentTypeAcronymResource;
use App\Modules\Catalogs\Queries\PublicCatalogQuery;
use App\Shared\Http\PaginatedResourceResponse;
use Illuminate\Http\JsonResponse;

class DocumentTypeAcronymController extends Controller
{
    public function index(CatalogIndexRequest $request, PublicCatalogQuery $query): JsonResponse
    {
        return PaginatedResourceResponse::make(
            $query->paginateAcronyms($request->validated()),
            DocumentTypeAcronymResource::class,
            $request,
        );
    }

    public function show(int $acronym, PublicCatalogQuery $query): JsonResponse
    {
        $item = $query->findAcronym($acronym);
        abort_if($item === null, 404);

        return (new DocumentTypeAcronymResource($item))->response();
    }
}
