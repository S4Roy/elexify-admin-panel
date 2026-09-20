import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ZohoBooksService {
  private readonly path = 'admin/integrations/zoho-books';
  constructor(private http: HttpService) {}
  status(): Observable<any> { return this.http.get(this.path); }
  connect(region: string) { return this.http.post(`${this.path}/connect`, { region }); }
  callback(state: string, code: string) { return this.http.post(`${this.path}/callback`, { state, code }); }
  disconnect(reason: string) { return this.http.post(`${this.path}/disconnect`, { reason }); }
  organizations(): Observable<any> { return this.http.get(`${this.path}/organizations`); }
  configure(configuration: unknown) { return this.http.put(`${this.path}/configuration`, configuration); }
  jobs(page: number, status = ''): Observable<any> { return this.http.get(`${this.path}/jobs?page=${page}${status ? `&status=${encodeURIComponent(status)}` : ''}`); }
  logs(page: number): Observable<any> { return this.http.get(`${this.path}/logs?page=${page}`); }
  sync(kind: string, ids: string[]) { return this.http.post(`${this.path}/sync`, { kind, ids }); }
  retry(id: string) { return this.http.post(`${this.path}/jobs/${encodeURIComponent(id)}/retry`, {}); }
  order(id: string): Observable<any> { return this.http.get(`${this.path}/orders/${encodeURIComponent(id)}`); }
  accounting(metadata: unknown) { return this.http.put(`${this.path}/accounting`, metadata); }
}
