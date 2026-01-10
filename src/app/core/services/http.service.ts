import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  readonly BASE_URL;
  constructor(private http: HttpClient) {
    this.BASE_URL = environment.API_URL;
  }

  post(uri: string, payload: any) {
    return this.http.post<any>(`${this.BASE_URL}${uri}`, payload);
  }
  put(uri: string, payload: any) {
    return this.http.put<any>(`${this.BASE_URL}${uri}`, payload);
  }
  postFormData(uri: string, payload: any) {
    let formData: FormData = new FormData();
    for (let key in payload) {
      formData.append(key, payload[key]);
    }
    return this.http.post<any>(`${this.BASE_URL}${uri}`, formData);
  }

  putFormData(uri: string, payload: any) {
    let formData: FormData = new FormData();
    for (let key in payload) {
      formData.append(key, payload[key]);
    }
    return this.http.put<any>(`${this.BASE_URL}${uri}`, formData);
  }

  get(uri: string, payload: any = {}) {
    return this.http.get<any>(`${this.BASE_URL}${uri}`, payload);
  }
  delete(uri: string, payload: any = {}) {
    return this.http.delete<any>(`${this.BASE_URL}${uri}`, {
      body: payload,
      observe: 'response', // To get full response including status codes
    });
  }
  getList(uri: string, payload: any): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
      observe: 'response' as 'response',
    };

    return this.http
      .get(`${this.BASE_URL}${uri}?${payload?.params ?? ''}`, httpOptions)
      .pipe(
        map((response) => {
          const paginationInfo = response.headers.get('X-Pagination');
          const pagingData = paginationInfo ? JSON.parse(paginationInfo) : null;
          const data = response.body;
          return { pagingData, data };
        })
      );
  }
  postList(uri: string, payload: any): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
      observe: 'response' as const, // Ensuring type compatibility
    };

    return this.http.post(`${this.BASE_URL}${uri}`, payload, httpOptions).pipe(
      map((response) => {
        const paginationInfo = response.headers.get('X-Pagination');
        const pagingData = paginationInfo ? JSON.parse(paginationInfo) : null;
        const data = response.body;
        return { pagingData, data };
      })
    );
  }
  downloadFile(uri: string) {
    let httpOptions: Object = { responseType: 'blob' };
    return this.http.get(`${this.BASE_URL}${uri}`, httpOptions);
  }
}
