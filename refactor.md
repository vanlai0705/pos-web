src/
├── core/
│   ├── contexts/                  # App-wide contexts
│   │   ├── app/
│   │   │   ├── app-context.tsx
│   │   │   ├── app-provider.tsx
│   │   │   └── types.ts
│   │   ├── theme/                # If you have theme context
│   │   │   ├── theme-context.tsx
│   │   │   └── theme-provider.tsx
│   │   └── index.tsx            # Export all contexts
│   ├── router/
│   │   ├── routes/
│   │   │   ├── index.tsx
│   │   │   ├── protected.tsx
│   │   │   └── public.tsx
│   │   └── components/
│   │       ├── PageNotFound.tsx
│   │       └── PageNotPermission.tsx
│   ├── store/
│   │   ├── middleware/
│   │   ├── slice/
│   │   ├── store.ts
│   │   └── hooks.ts
│   ├── socket/
│   │   ├── provider/
│   │   │   ├── socket-provider.tsx
│   │   │   └── socket-context.ts  # Socket context stays with socket
│   │   ├── types/
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── i18n/
│   │   ├── config/
│   │   ├── locales/
│   │   └── index.ts
│   └── connectors/
│       ├── metamask/
│       └── types/
├── features/
│   ├── games/
│   │   ├── even-odd/
│   │   │   ├── components/
│   │   │   ├── contexts/         # Game-specific contexts
│   │   │   │   └── game-state/
│   │   │   │       ├── context.tsx
│   │   │   │       ├── provider.tsx
│   │   │   │       └── types.ts
│   │   │   ├── store/
│   │   │   │   └── slice.ts
│   │   │   ├── types/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   ├── routes.tsx
│   │   │   └── index.tsx
│   │   ├── under-over/
│   │   │   ├── components/
│   │   │   ├── contexts/         # Under-over specific contexts
│   │   │   │   └── game-state/
│   │   │   └── [similar structure]
│   │   └── lotto/
│   │       ├── components/
│   │       ├── contexts/         # Lotto specific contexts
│   │       │   └── game-state/
│   │       └── [similar structure]
│   ├── wallet/
│   │   ├── components/
│   │   │   ├── WalletConnect/
│   │   │   ├── WalletStatus/
│   │   │   └── WalletTransactions/
│   │   ├── contexts/            # Wallet-specific contexts
│   │   │   └── wallet-state/
│   │   │       ├── context.tsx
│   │   │       ├── provider.tsx
│   │   │       └── types.ts
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── routes.tsx
│   │   └── index.tsx
│   └── transactions/
│       ├── components/
│       ├── contexts/            # Transaction-specific contexts
│       ├── store/
│       ├── types/
│       ├── routes.tsx
│       └── index.tsx
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── icons/
│   │   └── animations/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── constants/
│   └── styles/
├── assets/
│   ├── images/
│   └── icons/
├── App.tsx
├── main.tsx
└── vite-env.d.ts