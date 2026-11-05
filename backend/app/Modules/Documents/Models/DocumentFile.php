<?php

namespace App\Modules\Documents\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DocumentFile extends Model
{
    protected $table = 'regulation_files';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'file_tomo' => 'integer',
            'file_nro_tipo' => 'integer',
            'file_status' => 'integer',
            'file_statusfile' => 'integer',
            'file_size' => 'float',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'file_idregulation');
    }

    public function ocrState(): HasOne
    {
        return $this->hasOne(DocumentOcrState::class, 'regulation_file_id');
    }

    public function artifacts(): HasMany
    {
        return $this->hasMany(OcrArtifact::class, 'regulation_file_id');
    }

    public function activeArtifacts(): HasMany
    {
        return $this->artifacts()->where('status', OcrArtifact::STATUS_ACTIVE);
    }
}
