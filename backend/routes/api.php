<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1/public')
    ->name('api.v1.public.')
    ->group(function (): void {
        require app_path('Modules/Catalogs/routes/public.php');
        require app_path('Modules/Documents/routes/public.php');
    });
