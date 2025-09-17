# Alert va Confirmation Sistemi

Bu ilovada browser'ning native alert va confirm dialoglarini zamonaviy toast xabarlar va custom dialog'lar bilan almashtirish uchun tizim yaratildi.

## Asosiy Komponentlar

### 1. ConfirmDialog.jsx
- Barcha confirmation dialog'lar uchun asosiy komponent
- Shadcn/ui Dialog komponentiga asoslangan
- Turli variant'larni qo'llab-quvvatlaydi (default, destructive)

### 2. useConfirm.js hook
- Confirmation dialog'larni boshqarish uchun hook
- Promise-based API bilan ishlaydi
- State management qiladi

### 3. alertService.js
- Native browser alert/confirm funksiyalarini override qiladi  
- Global ravishda ishlaydi
- Turli xil alert turlari uchun helper funksiyalar

## Qanday ishlaydi

### Avtomatik o'tkazish
Tizim avtomatik ravishda quyidagi funksiyalarni almashtiradi:

```javascript
// Eski usul
alert('Xabar')           // → Toast xabar
confirm('Davom?')        // → Confirmation dialog
```

### Yangi API

#### Alert'lar
```javascript
import { showSuccessAlert, showErrorAlert, showWarningAlert, showInfoAlert } from '../services/alertService'

showSuccessAlert('Muvaffaqiyat!')
showErrorAlert('Xatolik yuz berdi!')
showWarningAlert('Diqqat bering!')
showInfoAlert('Ma\'lumot')
```

#### Confirmation'lar
```javascript
import { showConfirm } from '../services/alertService'

const result = await showConfirm('Davom etmoqchimisiz?', {
  title: 'Tasdiqlash',
  confirmText: 'Ha',
  cancelText: 'Yo\'q',
  variant: 'default' // yoki 'destructive'
})

if (result) {
  // Foydalanuvchi "Ha" bosdi
} else {
  // Foydalanuvchi "Yo'q" bosdi yoki dialog'ni yopdi
}
```

## Konfiguratsiya

Tizim App.jsx da avtomatik ishga tushiriladi:

```javascript
import { initAlertService } from './services/alertService'
import { useToast } from './hooks/use-toast'
import { useConfirm } from './hooks/useConfirm'

function App() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  
  useEffect(() => {
    initAlertService(toast, confirm)
  }, [toast, confirm])
  
  // ...
}
```

## Test qilish

AlertTestComponent.jsx faylida turli xil alert va confirmation'larni test qilish uchun misallar mavjud.

## Afzalliklar

1. **Zamonaviy UI**: Native browser dialog'lardan ko'ra chiroyliroq
2. **Moslashuvchan**: Turli xil stil va variant'lar
3. **Uyg'un**: Ilova dizayni bilan mos keladi  
4. **Responsive**: Har qanday ekran o'lchamida ishlaydi
5. **Avtomatik**: Eski kod o'zgarmasdan ishlaydi
6. **Toast Integration**: Mavjud toast tizimi bilan ishlaydi

## Eslatmalar

- Barcha eski `alert()` va `confirm()` chaqiruvlari avtomatik o'tkaziladi
- Yangi kodda `showSuccessAlert`, `showConfirm` kabi funksiyalardan foydalanish tavsiya etiladi
- Tizim butun ilovada global ravishda ishlaydi
- Har qanday komponentdan to'g'ridan-to'g'ri ishlatish mumkin
