<?php

namespace App\Modules\Documents\Enums;

enum RepresentationType: string
{
    case Original = 'original';
    case SearchablePdf = 'pdf-searchable';
    case Jsonl = 'jsonl';
    case Markdown = 'markdown';

    public function artifactType(): ?string
    {
        return match ($this) {
            self::Original => null,
            self::SearchablePdf => 'pdf',
            self::Jsonl => 'text',
            self::Markdown => 'md',
        };
    }

    public function contentType(): string
    {
        return match ($this) {
            self::Original, self::SearchablePdf => 'application/pdf',
            self::Jsonl => 'application/x-ndjson; charset=utf-8',
            self::Markdown => 'text/markdown; charset=utf-8',
        };
    }

    public function extension(): string
    {
        return match ($this) {
            self::Original, self::SearchablePdf => 'pdf',
            self::Jsonl => 'jsonl',
            self::Markdown => 'md',
        };
    }
}
