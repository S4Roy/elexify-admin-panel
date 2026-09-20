import { Injectable, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class ExportDownloadService {
  private toastr = inject(ToastrService);
  download(request: Observable<any>, entity: string, done: () => void): void {
    request.pipe(finalize(done)).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${entity}-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        this.toastr.success('Export downloaded');
      },
      error: async err => {
        let message = err?.error?.message || 'Export failed';
        if (err?.error instanceof Blob) {
          try { message = JSON.parse(await err.error.text()).message || message; } catch {}
        }
        this.toastr.error(message);
      },
    });
  }
}
