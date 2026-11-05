<?php

namespace App\Modules\Documents\Models;

use App\Modules\Catalogs\Models\DocumentProcess;
use App\Modules\Catalogs\Models\DocumentType;
use App\Modules\Catalogs\Models\DocumentTypeAcronym;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    public const STATUS_PUBLISHED = 1;

    protected $table = 'regulations';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'reg_date' => 'date',
            'reg_status' => 'integer',
            'reg_status_file' => 'integer',
            'reg_num' => 'integer',
            'reg_correlativo' => 'integer',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('reg_status', self::STATUS_PUBLISHED);
    }

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'regulations_tipo');
    }

    public function acronym(): BelongsTo
    {
        return $this->belongsTo(DocumentTypeAcronym::class, 'regulations_tipos_sigla_id');
    }

    public function process(): BelongsTo
    {
        return $this->belongsTo(DocumentProcess::class, 'reg_process_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DocumentFile::class, 'file_idregulation');
    }
}
