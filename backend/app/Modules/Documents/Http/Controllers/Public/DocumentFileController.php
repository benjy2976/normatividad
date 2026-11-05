<?php

namespace App\Modules\Documents\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Http\Requests\DocumentFileIndexRequest;
use App\Modules\Documents\Http\Resources\DocumentFileResource;
use App\Modules\Documents\Queries\PublicDocumentQuery;
use App\Modules\Documents\Services\DocumentRepresentationResolver;
use App\Shared\Http\PaginatedResourceResponse;
use Illuminate\Http\JsonResponse;

class DocumentFileController extends Controller
{
    public function index(
        int $document,
        DocumentFileIndexRequest $request,
        PublicDocumentQuery $query
    ): JsonResponse {
        abort_if($query->find($document) === null, 404);

        return PaginatedResourceResponse::make(
            $query->paginateFiles($document, $request->validated()),
            DocumentFileResource::class,
            $request,
        );
    }

    public function show(
        int $document,
        int $file,
        PublicDocumentQuery $query,
        DocumentRepresentationResolver $representations
    ): JsonResponse {
        $item = $query->findFile($document, $file);
        abort_if($item === null, 404);

        return (new DocumentFileResource($item, $representations->manifest($item)))->response();
    }
}
