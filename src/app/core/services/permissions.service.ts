import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { HelpersService } from './helpers.service';
import { Observable, map, catchError, of, first } from 'rxjs';
interface RoleDetails {
  roleClaims: string[]; // Adjust the type according to your actual data structure
}
@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  USER_PERMISSIONS: string = 'tems-user-permissions';

  constructor(
    private apiService: ApiService,
    private helpers: HelpersService
  ) {}
  getAllPermissions(): Observable<string[]> {
    return this.apiService.roleDetails(this.helpers.role_id()).pipe(
      map((role: any) => role?.roleClaims ?? []),
      catchError((err) => of([])) // Handle errors gracefully
    );
  }
  async getAllClaims() {
    try {
      const res = await this.getAllPermissions().pipe(first()).toPromise();      
      return res
    } catch (error) {
      console.error('Error fetching claims:', error);
      return []
    }
  }
  
  hasPermission(claims: any[], permissionType: string): boolean {
    // Iterate through the claims to find a match for the permissionType
    for (const claim of claims) {
      if (claim.claimType === permissionType) {
        return true; // Permission found
      }
    }
    return false; // No matching permission found
  }
}
