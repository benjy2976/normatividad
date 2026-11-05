<?php

namespace App\Modules\Documents\Services;

use App\Modules\Documents\Enums\RepresentationType;
use App\Modules\Documents\Models\DocumentFile;
use App\Modules\Documents\Models\OcrArtifact;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DocumentRepresentationResolver
{
    /**
     * @return array{trusted: bool, defaultRepresentation: ?string, representations: list<array<string, mixed>>}
     */
    public function manifest(DocumentFile $file): array
    {
        $original = $this->resolveOriginal($file);
        if ($original === null) {
            return [
                'trusted' => false,
                'defaultRepresentation' => null,
                'representations' => [],
            ];
        }

        $file->loadMissing('activeArtifacts');
        $representations = [];
        $searchable = $this->resolveArtifact($file, RepresentationType::SearchablePdf);
        $sourceReused = $searchable !== null && ($searchable['sourceReused'] ?? false) === true;

        if ($searchable !== null) {
            $representations[] = $this->publicDescriptor($searchable);
        }
        if (! $sourceReused) {
            $representations[] = $this->publicDescriptor($original);
        }

        foreach ([RepresentationType::Jsonl, RepresentationType::Markdown] as $type) {
            $resolved = $this->resolveArtifact($file, $type);
            if ($resolved !== null) {
                $representations[] = $this->publicDescriptor($resolved);
            }
        }

        return [
            'trusted' => true,
            'defaultRepresentation' => $searchable !== null
                ? RepresentationType::SearchablePdf->value
                : RepresentationType::Original->value,
            'representations' => $representations,
        ];
    }

    /**
     * @return array{type: string, disk: string, path: string, contentType: string, size: int, filename: string, sourceReused: bool}|null
     */
    public function resolve(DocumentFile $file, RepresentationType $type): ?array
    {
        $original = $this->resolveOriginal($file);
        if ($original === null) {
            return null;
        }
        if ($type === RepresentationType::Original) {
            return $original;
        }

        $file->loadMissing('activeArtifacts');

        return $this->resolveArtifact($file, $type);
    }

    private function resolveOriginal(DocumentFile $file): ?array
    {
        $path = $this->safeRelativePath($file->file_ruta);
        if ($path === null || ! $this->exists('regulations', $path)) {
            return null;
        }

        return [
            'type' => RepresentationType::Original->value,
            'disk' => 'regulations',
            'path' => $path,
            'contentType' => $this->originalContentType($file),
            'size' => $this->size('regulations', $path, (int) $file->file_size),
            'filename' => $this->filename($file, RepresentationType::Original),
            'sourceReused' => false,
        ];
    }

    private function resolveArtifact(DocumentFile $file, RepresentationType $type): ?array
    {
        $artifactType = $type->artifactType();
        $artifact = $file->activeArtifacts
            ->where('artifact_type', $artifactType)
            ->sortByDesc('id')
            ->first();

        if (! $artifact instanceof OcrArtifact) {
            return null;
        }

        $sourceReused = $type === RepresentationType::SearchablePdf
            && $artifact->origin === OcrArtifact::ORIGIN_SOURCE_REUSED;
        $disk = $sourceReused ? 'regulations' : 'ocr_cache';
        $path = $this->safeRelativePath($sourceReused ? $file->file_ruta : $artifact->storage_path);

        if ($path === null || ! $this->exists($disk, $path)) {
            return null;
        }

        return [
            'type' => $type->value,
            'disk' => $disk,
            'path' => $path,
            'contentType' => $type->contentType(),
            'size' => $this->size($disk, $path, (int) ($artifact->size ?? 0)),
            'filename' => $this->filename($file, $type),
            'sourceReused' => $sourceReused,
        ];
    }

    private function publicDescriptor(array $resolved): array
    {
        return [
            'tipo' => $resolved['type'],
            'mimeType' => $resolved['contentType'],
            'tamano' => $resolved['size'],
            'fuenteReutilizada' => $resolved['sourceReused'],
        ];
    }

    private function safeRelativePath(?string $path): ?string
    {
        $path = str_replace('\\', '/', trim((string) $path));
        $path = ltrim($path, '/');
        if ($path === '' || str_contains($path, "\0")) {
            return null;
        }

        foreach (explode('/', $path) as $segment) {
            if ($segment === '..') {
                return null;
            }
        }

        return $path;
    }

    private function exists(string $disk, string $path): bool
    {
        try {
            return Storage::disk($disk)->exists($path);
        } catch (Throwable) {
            return false;
        }
    }

    private function size(string $disk, string $path, int $fallback): int
    {
        if ($fallback > 0) {
            return $fallback;
        }

        try {
            return (int) Storage::disk($disk)->size($path);
        } catch (Throwable) {
            return 0;
        }
    }

    private function originalContentType(DocumentFile $file): string
    {
        if (strtolower(pathinfo((string) $file->file_ruta, PATHINFO_EXTENSION)) === 'pdf') {
            return 'application/pdf';
        }

        return trim((string) $file->file_type) ?: 'application/octet-stream';
    }

    private function filename(DocumentFile $file, RepresentationType $type): string
    {
        $base = pathinfo((string) $file->file_name, PATHINFO_FILENAME);
        $base = trim($base) !== '' ? trim($base) : 'documento-'.$file->id;

        return $base.'.'.$type->extension();
    }
}
