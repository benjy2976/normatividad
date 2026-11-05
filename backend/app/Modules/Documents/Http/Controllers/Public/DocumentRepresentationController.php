<?php

namespace App\Modules\Documents\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Enums\RepresentationType;
use App\Modules\Documents\Http\Requests\RepresentationRequest;
use App\Modules\Documents\Queries\PublicDocumentQuery;
use App\Modules\Documents\Services\DocumentRepresentationResolver;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentRepresentationController extends Controller
{
    public function show(
        int $document,
        int $file,
        string $representation,
        RepresentationRequest $request,
        PublicDocumentQuery $query,
        DocumentRepresentationResolver $resolver
    ): BinaryFileResponse {
        $item = $query->findFile($document, $file);
        abort_if($item === null, 404);

        $type = RepresentationType::from($representation);
        $resolved = $resolver->resolve($item, $type);
        abort_if($resolved === null, 404);

        $headers = [
            'Content-Type' => $resolved['contentType'],
            'Cache-Control' => 'public, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ];
        $absolutePath = Storage::disk($resolved['disk'])->path($resolved['path']);

        if ($request->validated('disposition') === 'attachment') {
            return response()->download($absolutePath, $resolved['filename'], $headers);
        }

        return response()->file($absolutePath, $headers);
    }
}
