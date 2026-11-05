<?php

namespace App\Modules\Documents\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OcrArtifact extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const ORIGIN_SOURCE_REUSED = 'source_reused';

    protected $table = 'regulation_file_ocr_artifacts';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'generated_at' => 'datetime',
            'activated_at' => 'datetime',
            'superseded_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function documentFile(): BelongsTo
    {
        return $this->belongsTo(DocumentFile::class, 'regulation_file_id');
    }
}
