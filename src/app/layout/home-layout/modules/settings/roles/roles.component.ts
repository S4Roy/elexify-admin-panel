import { MenuComponent } from 'app/layout/home-layout/includes/menu/menu.component';
import { EmptyStateComponent } from 'app/layout/home-layout/includes/empty-state/empty-state.component';
import { HelpersService } from 'app/core/services/helpers.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from 'app/core/services/auth.service';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NgSelectModule } from '@ng-select/ng-select';
import { DialogService } from 'app/core/services/dialog.service';
import { PaginationComponent } from 'app/layout/home-layout/includes/pagination/pagination.component';
import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { HttpService } from 'app/core/services/http.service';
import { PermissionService } from 'app/core/services/permission.service';
interface Role {
  _id: string;
  name: string;
  description: string;
  status: string;
  permissions: string[];
  protected: boolean;
  system_role: boolean;
  user_count: number;
  __v: number;
}
interface Permission {
  _id: string;
  module: string;
  action: string;
}
@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    MatDialogModule,
    PaginationComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    EmptyStateComponent,
  ],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent implements OnInit, OnDestroy {
  readonly access = inject(PermissionService);
  private http = inject(HttpService);
  private helpers = inject(HelpersService);
  private destroy$ = new Subject<void>();
  private staffSearchSubject = new Subject<string>();
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private dialogs = inject(DialogService);
  private editorRef?: MatDialogRef<unknown>;
  @ViewChild('roleDialog') roleDialog!: TemplateRef<unknown>;
  @ViewChild('staffDialog') staffDialog!: TemplateRef<unknown>;
  rolePage = 1;
  roleSearch = '';
  staffPagination = { page: 1, limit: 50, totalDocs: 0, totalPages: 1 };
  get filteredRoles() {
    return this.roles.filter((role) =>
      (role.name + ' ' + role.description)
        .toLowerCase()
        .includes(this.roleSearch.trim().toLowerCase()),
    );
  }
  get rolePagination() {
    return {
      page: this.rolePage,
      limit: 10,
      totalDocs: this.filteredRoles.length,
      totalPages: Math.max(1, Math.ceil(this.filteredRoles.length / 10)),
    };
  }
  get visibleRoles() {
    return this.filteredRoles.slice(
      (this.rolePage - 1) * 10,
      this.rolePage * 10,
    );
  }
  openDialog(template: TemplateRef<unknown>, width: string) {
    this.error = '';
    this.editorRef = this.dialog.open(template, {
      width,
      maxWidth: '96vw',
      maxHeight: '92vh',
      disableClose: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }
  closeEditor() {
    if (!this.busy) {
      this.editorRef?.close();
      this.editing = null;
    }
  }
  addStaff() {
    this.newStaff = { name: '', email: '', password: '', role_id: '' };
    this.openDialog(this.staffDialog, '560px');
  }
  async confirmAction(title: string, message: string, saveText: string) {
    const result: any = await firstValueFrom(
      this.dialogs.confirmDialog({
        title,
        message,
        saveText,
        cancelText: 'Cancel',
      }),
    );
    return result?.confirm === true;
  }
  roles: Role[] = [];
  permissions: Permission[] = [];
  staff: any[] = [];
  editing: Partial<Role> | null = null;
  selected = new Set<string>();
  search = '';
  error = '';
  message = '';
  busy = false;
  staffPage = 1;
  staffSearch = '';
  newStaff = { name: '', email: '', password: '', role_id: '' };
  async ngOnInit() {
    this.staffSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.staffPage = 1;
        this.loadStaff();
      });
    await this.run(async () => {
      await this.load();
    });
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  onStaffSearchChange(value: string) {
    this.staffSearch = value;
    this.staffSearchSubject.next(value);
  }
  readOnly = false;
  label(value: string) {
    return value.replace(/[_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  initials(name: string) {
    return (name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('');
  }
  moduleLabel(p: Permission) {
    return p._id.startsWith('zoho_') ||
      p._id === 'integration_credential.manage'
      ? 'Zoho Books'
      : this.label(p.module);
  }
  permissionLabel(p: Permission) {
    return (
      (
        {
          'zoho_sync.view': 'View connection, sync jobs & logs',
          'zoho_sync.manage': 'Queue synchronization & retry jobs',
          'zoho_invoice.manage': 'Manage Zoho invoices',
          'integration_credential.manage': 'Configure connection & accounting',
        } as Record<string, string>
      )[p._id] || this.label(p.action)
    );
  }
  permissionDescription(p: Permission) {
    return p._id === 'integration_credential.manage'
      ? 'Connect, disconnect, configure tax mapping and accounting metadata. Also grants access to shared integration credentials.'
      : p._id;
  }
  selectedCount(items: Permission[]) {
    return items.filter((p) => this.selected.has(p._id)).length;
  }
  inspect(role: Role) {
    this.edit(role);
    this.readOnly = true;
  }
  // A plain field, not a getter — a getter re-evaluates on every
  // change-detection run (e.g. every checkbox toggle, since toggle()
  // mutates `selected` which every permission-option row reads), handing
  // *ngFor a brand-new array of brand-new group objects each time. Even
  // with trackBy that's extra diffing for nothing; toggling a checkbox
  // never actually changes which modules/permissions match the search, so
  // this only needs to be recomputed when `permissions` loads or `search`
  // changes — see computeGroups().
  groups: { module: string; items: Permission[] }[] = [];
  computeGroups() {
    const groups = new Map<string, Permission[]>();
    for (const permission of this.permissions.filter((p) =>
      [
        p._id,
        this.moduleLabel(p),
        this.permissionLabel(p),
        this.permissionDescription(p),
      ]
        .join(' ')
        .toLowerCase()
        .includes(this.search.trim().toLowerCase()),
    )) {
      const module = this.moduleLabel(permission);
      groups.set(module, [...(groups.get(module) || []), permission]);
    }
    this.groups = [...groups]
      .map(([module, items]) => ({ module, items }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }
  onSearchChange(value: string) {
    this.search = value;
    this.computeGroups();
  }
  trackByModule(_: number, group: { module: string; items: Permission[] }) {
    return group.module;
  }
  trackByPermissionId(_: number, p: Permission) {
    return p._id;
  }
  staffRole(user: any) {
    return this.roles.find((role) => role._id === user.admin_role_id);
  }
  canManageStaff(user: any) {
    const role = this.staffRole(user);
    let currentUserId: string | undefined;
    try {
      currentUserId = JSON.parse(this.auth.getUserData() || '{}')._id;
    } catch {
      return false;
    }
    return (
      user._id !== currentUserId &&
      (!user.admin_role_id || (!!role && this.manageable(role)))
    );
  }
  manageable(role: Role) {
    return !role.protected && this.access.canAll(role.permissions);
  }
  edit(role?: Role) {
    this.readOnly = false;
    this.search = '';
    this.editing = role
      ? { ...role }
      : { name: '', description: '', status: 'active' };
    this.selected = new Set(role?.permissions || []);
    this.computeGroups();
    this.openDialog(this.roleDialog, '1280px');
  }
  toggle(key: string) {
    this.selected.has(key) ? this.selected.delete(key) : this.selected.add(key);
  }
  selectModule(items: Permission[], enabled: boolean) {
    items.forEach((p) => {
      if (!enabled) this.selected.delete(p._id);
      else if (this.access.can(p._id)) this.selected.add(p._id);
    });
  }
  selectAll() {
    this.selected = new Set(
      this.permissions.filter((p) => this.access.can(p._id)).map((p) => p._id),
    );
  }
  viewOnly() {
    this.selected = new Set(
      this.permissions
        .filter((p) => p.action.endsWith('view') && this.access.can(p._id))
        .map((p) => p._id),
    );
  }
  async load() {
    const [roles, permissions] = await Promise.all([
      firstValueFrom(this.http.get('admin/role/list')),
      firstValueFrom(this.http.get('admin/role/permission-list')),
    ]);
    this.roles = roles.data;
    this.rolePage = Math.min(this.rolePage, this.rolePagination.totalPages);
    this.permissions = permissions.data;
    if (this.access.can('staff.view')) await this.loadStaff();
  }
  async loadStaff() {
    try {
      const result = (
        await firstValueFrom(
          this.http.get(
            `admin/role/staff?paginated=true&page=${this.staffPage}&search=${encodeURIComponent(this.staffSearch)}`,
          ),
        )
      ).data;
      this.staff = result.docs;
      this.staffPagination = result;
      if (!this.staff.length && this.staffPage > result.totalPages) {
        this.staffPage = Math.max(1, result.totalPages);
        await this.loadStaff();
      }
    } catch (e: any) {
      this.error = e.error?.message || 'Could not load staff.';
    }
  }
  async run(action: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.message = '';
    try {
      await action();
    } catch (e: any) {
      this.error = e.error?.message || e.message || 'The operation failed.';
    } finally {
      this.busy = false;
    }
  }
  async save() {
    const role = this.editing;
    if (!role) return;
    await this.run(async () => {
      const payload = {
        name: role.name,
        description: role.description,
        status: role.status,
        permissions: [...this.selected],
        ...(role._id ? { version: role.__v } : {}),
      };
      await firstValueFrom(
        role._id
          ? this.http.put(`admin/role/${role._id}`, payload)
          : this.http.post('admin/role', payload),
      );
      this.editorRef?.close();
      this.editing = null;
      await this.access.refresh();
      await this.load();
      this.message = 'Role saved.';
    });
  }
  async duplicate(role: Role) {
    await this.run(async () => {
      await firstValueFrom(
        this.http.post(`admin/role/${role._id}/duplicate`, {
          name: `${role.name} copy`.slice(0, 100),
        }),
      );
      await this.load();
    });
  }
  async remove(role: Role) {
    if (
      !(await this.confirmAction(
        'Delete role',
        `Delete role “${role.name}”? This cannot be undone.`,
        'Delete role',
      ))
    )
      return;
    await this.run(async () => {
      await firstValueFrom(this.http.delete(`admin/role/${role._id}`));
      await this.load();
    });
  }
  async assign(user: any, role_id: string | null) {
    if (role_id === user.admin_role_id) return;
    if (
      !(await this.confirmAction(
        'Change staff role',
        `Change admin access for “${user.name}”?`,
        'Change role',
      ))
    ) {
      this.staff = this.staff.map((item) => ({ ...item }));
      return;
    }
    await this.run(async () => {
      await firstValueFrom(
        this.http.put(`admin/role/staff/${user._id}/role`, { role_id }),
      );
      await this.load();
    });
  }
  async setStatus(user: any) {
    if (
      !(await this.confirmAction(
        'Change account status',
        `${user.status === 'active' ? 'Deactivate' : 'Activate'} “${user.name}”?`,
        'Confirm',
      ))
    )
      return;
    await this.run(async () => {
      await firstValueFrom(
        this.http.put(`admin/role/staff/${user._id}`, {
          name: user.name,
          status: user.status === 'active' ? 'inactive' : 'active',
        }),
      );
      await this.loadStaff();
    });
  }
  async deleteStaff(user: any) {
    if (
      !(await this.confirmAction(
        'Delete staff account',
        `Remove “${user.name}” and their admin access?`,
        'Delete account',
      ))
    )
      return;
    await this.run(async () => {
      await firstValueFrom(this.http.delete(`admin/role/staff/${user._id}`));
      await this.load();
    });
  }
  async createStaff() {
    await this.run(async () => {
      await firstValueFrom(this.http.post('admin/role/staff', this.newStaff));
      this.editorRef?.close();
      this.newStaff = { name: '', email: '', password: '', role_id: '' };
      await this.load();
      this.message = 'Staff account created.';
    });
  }
}
