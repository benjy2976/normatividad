<?php

namespace App\Modules\Documents\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentOcrState extends Model
{
    protected $table = 'regulation_file_ocrs';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'status' => 'integer',
            'source_page_count' => 'integer',
            'has_pdf' => 'boolean',
            'has_text' => 'boolean',
            'has_md' => 'boolean',
            'processed_at' => 'datetime',
        ];
    }

    public function documentFile(): BelongsTo
    {
        return $this->belongsTo(DocumentFile::class, 'regulation_file_id');
    }
}
