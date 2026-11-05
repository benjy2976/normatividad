<?php

namespace App\Modules\Documents\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Http\Requests\DocumentIndexRequest;
use App\Modules\Documents\Http\Resources\DocumentResource;
use App\Modules\Documents\Queries\PublicDocumentQuery;
use App\Shared\Http\PaginatedResourceResponse;
use Illuminate\Http\JsonResponse;

class DocumentController extends Controller
{
    public function index(DocumentIndexRequest $request, PublicDocumentQuery $query): JsonResponse
    {
        return PaginatedResourceResponse::make(
            $query->paginate($request->validated()),
            DocumentResource::class,
            $request,
        );
    }

    public function show(int $document, PublicDocumentQuery $query): JsonResponse
    {
        $item = $query->find($document);
        abort_if($item === null, 404);

        return (new DocumentResource($item))->response();
    }
}
