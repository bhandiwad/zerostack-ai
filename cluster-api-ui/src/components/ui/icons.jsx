import React from 'react';
import {
  HomeIcon,
  CogIcon,
  ChartBarIcon,
  BugAntIcon,
  WrenchScrewdriverIcon,
  CloudIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CpuChipIcon,
  ServerIcon,
  CommandLineIcon,
  DocumentTextIcon,
  FolderIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  TagIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  KeyIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  AdjustmentsHorizontalIcon,
  Cog6ToothIcon,
  BeakerIcon,
  RocketLaunchIcon,
  SparklesIcon,
  LightBulbIcon,
  AcademicCapIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  LifebuoyIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  LinkIcon,
  ShareIcon,
  HeartIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

import {
  HomeIcon as HomeSolid,
  CogIcon as CogSolid,
  ChartBarIcon as ChartBarSolid,
  BugAntIcon as BugAntSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverSolid,
  CloudIcon as CloudSolid,
  CheckCircleIcon as CheckCircleSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  InformationCircleIcon as InformationCircleSolid,
  XCircleIcon as XCircleSolid,
  PlayIcon as PlaySolid,
  PauseIcon as PauseSolid,
  StopIcon as StopSolid,
  HeartIcon as HeartSolid,
  StarIcon as StarSolid,
  FireIcon as FireSolid,
  BoltIcon as BoltSolid,
  SunIcon as SunSolid,
  MoonIcon as MoonSolid,
} from '@heroicons/react/24/solid';

// Icon component with consistent sizing and styling
export const Icon = ({ 
  name, 
  variant = 'outline', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
  };

  const iconMap = {
    // Navigation
    home: variant === 'solid' ? HomeSolid : HomeIcon,
    settings: variant === 'solid' ? CogSolid : CogIcon,
    metrics: variant === 'solid' ? ChartBarSolid : ChartBarIcon,
    debugging: variant === 'solid' ? BugAntSolid : BugAntIcon,
    maintenance: variant === 'solid' ? WrenchScrewdriverSolid : WrenchScrewdriverIcon,
    
    // Infrastructure
    cloud: variant === 'solid' ? CloudSolid : CloudIcon,
    server: ServerIcon,
    cpu: CpuChipIcon,
    terminal: CommandLineIcon,
    
    // Actions
    plus: PlusIcon,
    search: MagnifyingGlassIcon,
    bell: BellIcon,
    user: UserCircleIcon,
    menu: Bars3Icon,
    close: XMarkIcon,
    
    // Arrows & Chevrons
    'chevron-right': ChevronRightIcon,
    'chevron-left': ChevronLeftIcon,
    'chevron-down': ChevronDownIcon,
    'chevron-up': ChevronUpIcon,
    'arrow-up-right': ArrowUpRightIcon,
    'arrow-down': ArrowDownIcon,
    'arrow-up': ArrowUpIcon,
    
    // Media Controls
    play: variant === 'solid' ? PlaySolid : PlayIcon,
    pause: variant === 'solid' ? PauseSolid : PauseIcon,
    stop: variant === 'solid' ? StopSolid : StopIcon,
    refresh: ArrowPathIcon,
    
    // Status
    warning: variant === 'solid' ? ExclamationTriangleSolid : ExclamationTriangleIcon,
    success: variant === 'solid' ? CheckCircleSolid : CheckCircleIcon,
    info: variant === 'solid' ? InformationCircleSolid : InformationCircleIcon,
    error: XCircleSolid,
    
    // Content
    document: DocumentTextIcon,
    folder: FolderIcon,
    eye: EyeIcon,
    edit: PencilIcon,
    delete: TrashIcon,
    
    // Time & Location
    calendar: CalendarIcon,
    clock: ClockIcon,
    location: MapPinIcon,
    tag: TagIcon,
    
    // Security
    shield: ShieldCheckIcon,
    lock: LockClosedIcon,
    key: KeyIcon,
    
    // Finance
    'credit-card': CreditCardIcon,
    money: BanknotesIcon,
    'chart-pie': ChartPieIcon,
    'chart-line': PresentationChartLineIcon,
    
    // Tools
    adjustments: AdjustmentsHorizontalIcon,
    cog: Cog6ToothIcon,
    beaker: BeakerIcon,
    rocket: RocketLaunchIcon,
    sparkles: SparklesIcon,
    lightbulb: LightBulbIcon,
    
    // Learning
    academic: AcademicCapIcon,
    book: BookOpenIcon,
    help: QuestionMarkCircleIcon,
    support: LifebuoyIcon,
    
    // Communication
    chat: ChatBubbleLeftRightIcon,
    phone: PhoneIcon,
    email: EnvelopeIcon,
    globe: GlobeAltIcon,
    link: LinkIcon,
    share: ShareIcon,
    
    // Engagement
    heart: variant === 'solid' ? HeartSolid : HeartIcon,
    star: variant === 'solid' ? StarSolid : StarIcon,
    fire: variant === 'solid' ? FireSolid : FireIcon,
    bolt: variant === 'solid' ? BoltSolid : BoltIcon,
    
    // Theme
    sun: variant === 'solid' ? SunSolid : SunIcon,
    moon: variant === 'solid' ? MoonSolid : MoonIcon,
  };

  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent 
      className={`${sizeClasses[size]} ${className}`} 
      {...props} 
    />
  );
};

// Provider icons with consistent styling
export const ProviderIcon = ({ provider, size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const providerIcons = {
    aws: (
      <svg className={`${sizeClasses[size]} ${className}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335c-.072.048-.144.072-.2.072-.08 0-.16-.04-.239-.112-.112-.12-.207-.248-.279-.384-.072-.135-.144-.296-.207-.495-.527.623-1.191.935-1.99.935-.568 0-1.022-.16-1.358-.488-.336-.328-.504-.76-.504-1.302 0-.576.2-1.04.608-1.398.408-.36.95-.535 1.622-.535.224 0 .456.016.703.056.248.04.504.088.775.16v-.527c0-.551-.112-.936-.344-1.15-.23-.215-.62-.327-1.165-.327-.25 0-.508.032-.772.088-.264.056-.52.135-.76.24-.112.048-.2.08-.248.096-.048.016-.08.024-.104.024-.088 0-.135-.064-.135-.2v-.312c0-.104.016-.18.056-.24.04-.063.112-.127.207-.183.248-.127.544-.232.888-.32.344-.087.712-.128 1.097-.128.838 0 1.454.191 1.846.575.394.384.59.96.59 1.735v2.287zm-2.742.942c.216 0 .44-.04.67-.12.23-.08.435-.216.607-.415.104-.12.18-.255.224-.408.048-.152.08-.336.08-.551v-.264c-.192-.048-.4-.088-.615-.112-.216-.024-.424-.04-.632-.04-.448 0-.78.088-1.006.264-.226.176-.336.424-.336.744 0 .304.08.527.24.67.158.144.39.232.768.232zm5.34 1.374c-.112 0-.186-.02-.23-.067-.048-.048-.088-.144-.135-.288L7.15 2.655c-.047-.144-.07-.24-.07-.28 0-.112.056-.175.168-.175h.686c.118 0 .197.02.237.067.047.048.087.144.127.288l1.662 6.55 1.55-6.55c.032-.144.072-.24.118-.288.047-.048.127-.067.237-.067h.56c.118 0 .197.02.237.067.047.048.087.144.118.288l1.574 6.614 1.726-6.614c.04-.144.08-.24.127-.288.047-.048.127-.067.237-.067h.65c.112 0 .175.056.175.175 0 .048-.008.096-.024.16-.016.063-.048.144-.096.264L14.862 12.02c-.047.144-.087.24-.135.288-.047.048-.118.067-.23.067h-.607c-.118 0-.197-.02-.237-.067-.047-.048-.087-.144-.118-.288L12.005 5.575 10.47 12.02c-.032.144-.072.24-.118.288-.047.048-.127.067-.237.067h-.607zm8.853.183c-.535 0-1.07-.063-1.598-.183-.528-.12-.936-.264-1.23-.44-.088-.048-.15-.104-.174-.16-.024-.056-.04-.12-.04-.191v-.32c0-.135.048-.2.135-.2.04 0 .08.008.127.024.048.016.12.048.2.08.264.12.55.216.855.28.304.063.608.096.903.096.48 0 .855-.08 1.118-.24.264-.16.4-.384.4-.68 0-.2-.064-.368-.2-.504-.135-.135-.4-.264-.78-.384l-1.118-.36c-.567-.18-.99-.44-1.262-.78-.27-.34-.408-.72-.408-1.135 0-.32.072-.6.216-.84.144-.24.336-.44.568-.6.23-.16.504-.28.815-.36.31-.08.64-.12.982-.12.23 0 .47.016.71.056.24.04.464.088.67.144.2.056.384.12.55.2.167.08.3.16.39.24.064.056.112.112.135.176.024.063.04.135.04.215v.304c0 .135-.048.2-.135.2-.056 0-.135-.024-.24-.08-.735-.336-1.558-.504-2.47-.504-.447 0-.8.072-1.046.216-.248.144-.375.36-.375.65 0 .2.072.375.216.518.144.144.424.288.84.424l1.094.35c.56.18.96.424 1.214.735.255.31.38.67.38 1.078 0 .328-.072.624-.216.888-.144.264-.336.488-.568.67-.23.183-.51.32-.83.415-.32.096-.67.144-1.046.144z"/>
      </svg>
    ),
    gcp: (
      <svg className={`${sizeClasses[size]} ${className}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.19 2.38a9.344 9.344 0 0 1 6.616 2.737L16.77 7.15a5.668 5.668 0 0 0-9.677 4.01H2.66a9.344 9.344 0 0 1 9.53-8.78zm7.42 4.02L17.57 8.44a5.668 5.668 0 0 1 1.194 3.476H24a9.344 9.344 0 0 0-4.39-5.04zM24 12.84h-5.236a5.668 5.668 0 0 1-1.194 3.476l2.04 2.04A9.344 9.344 0 0 0 24 12.84zm-5.23 6.516-2.04-2.04a5.668 5.668 0 0 1-4.54 2.302v2.884a9.344 9.344 0 0 0 6.58-3.146zm-7.46 3.146v-2.884a5.668 5.668 0 0 1-4.54-2.302l-2.04 2.04a9.344 9.344 0 0 0 6.58 3.146zM2.39 18.36l2.04-2.04a5.668 5.668 0 0 1-1.194-3.476H0a9.344 9.344 0 0 0 2.39 5.516zM0 11.16h3.236a5.668 5.668 0 0 1 1.194-3.476L2.39 5.64A9.344 9.344 0 0 0 0 11.16z"/>
      </svg>
    ),
    azure: (
      <svg className={`${sizeClasses[size]} ${className}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.483 21L12 3l6.517 18H5.483zm8.925-3.448l-2.319-6.348L8.637 17.552h5.771z"/>
      </svg>
    ),
  };

  return providerIcons[provider] || <Icon name="cloud" size={size} className={className} />;
};

// Status indicator with icon and color
export const StatusIcon = ({ status, size = 'sm', showText = false, className = '' }) => {
  const statusConfig = {
    running: { icon: 'success', color: 'text-green-600', text: 'Running' },
    stopped: { icon: 'error', color: 'text-red-600', text: 'Stopped' },
    creating: { icon: 'info', color: 'text-blue-600', text: 'Creating' },
    maintenance: { icon: 'warning', color: 'text-yellow-600', text: 'Maintenance' },
    pending: { icon: 'clock', color: 'text-gray-600', text: 'Pending' },
    error: { icon: 'error', color: 'text-red-600', text: 'Error' },
    healthy: { icon: 'success', color: 'text-green-600', text: 'Healthy' },
    unhealthy: { icon: 'warning', color: 'text-red-600', text: 'Unhealthy' },
    unknown: { icon: 'help', color: 'text-gray-600', text: 'Unknown' },
  };

  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Icon 
        name={config.icon} 
        variant="solid" 
        size={size} 
        className={config.color} 
      />
      {showText && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default Icon;
