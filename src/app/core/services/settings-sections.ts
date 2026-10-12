// Settings pages shown on the Settings overview, in sidebar order. Also used
// by PermissionService: Settings is reachable only when one of these is.
export const SETTINGS_SECTIONS = [
  { label: 'Roles & Permissions', description: 'Manage roles, permissions and staff access', router_path: '/settings/roles' },
  { label: 'Zoho Books', description: 'Accounting integration and synchronization', router_path: '/settings/integrations/zoho-books' },
  { label: 'Site Settings', description: 'Store and company details', router_path: '/settings/site' },
  { label: 'Media', description: 'Manage uploaded assets', router_path: '/settings/media' },
  { label: 'Countries', description: 'Manage countries', router_path: '/settings/countries' },
  { label: 'States', description: 'Manage states', router_path: '/settings/states' },
  { label: 'Cities', description: 'Manage cities', router_path: '/settings/cities' },
  { label: 'Pincodes', description: 'Manage delivery pincodes', router_path: '/settings/pincodes' },
  { label: 'Currency', description: 'Manage currency', router_path: '/settings/currency' },
  { label: 'Shipping Settings', description: 'Configure fulfillment', router_path: '/settings/shipping-settings' },
  { label: 'SEO Settings', description: 'Search visibility defaults', router_path: '/settings/seo' },
  { label: 'Email Templates', description: 'Customer email messages', router_path: '/settings/email-templates' },
  { label: 'SMS Templates', description: 'Customer text messages', router_path: '/settings/sms-templates' },
  { label: 'App Updates', description: 'Update prompts and app links', router_path: '/settings/app-updates' },
  { label: 'Integration Credentials', description: 'Connected service credentials', router_path: '/settings/integration-credentials' },
  { label: 'Data Operations', description: 'Maintenance and migrations', router_path: '/settings/data-operations' },
];
