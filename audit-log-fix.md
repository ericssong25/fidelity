# Zuma — Audit Log Fixes

## 🔴 CRITICAL (5 issues)

### ✅ #1 — Toasts duplicados en pantalla
**Archivo:** `App.tsx` líneas 82 y 135
**Problema:** `ToastContainer` se renderiza en `AppRoutes` y en `AuthenticatedRoutes`. Cada toast aparece dos veces.
**Fix:** Eliminado `<ToastContainer />` de `AuthenticatedRoutes` (línea 82). Solo queda en `AppRoutes`.
**Estado:** ✅ Completado

### ⏳ #2 — Ruta `/explore` rota
**Archivo:** `CardsPage.tsx` + `App.tsx`
**Problema:** El botón "Explorar Negocios" navega a `/explore`, ruta no registrada. Redirige a `/home`.
**Fix:** Registrar `<Route path="/explore" element={<ExplorePage />} />` o eliminar el botón.
**Estado:** Pendiente — se implementará cuando haya suficientes negocios registrados.

### ⏳ #3 — `ExploreBusinessPage.tsx` — mock data muerto
**Archivo:** `src/pages/customer/ExploreBusinessPage.tsx`
**Problema:** Sin ruta, sin Supabase, todo inglés, código muerto.
**Fix:** Eliminar o conectar a datos reales.
**Estado:** Pendiente — se implementará con el marketplace de negocios.

### ⚠️ #4 — Sin flujo de "Olvidé mi contraseña"
**Archivo:** `AuthPage.tsx`, `ResetPasswordPage.tsx`, `App.tsx`, `ProfilePage.tsx`
**Fix:**
- `AuthPage.tsx`: Link "¿Olvidaste tu contraseña?" en Sign In → input email → `resetPasswordForEmail()` → toast confirmación
- `ResetPasswordPage.tsx`: Nuevo — recibe token vía URL, formulario nueva contraseña + confirmación, `updateUser({ password })`
- `App.tsx`: Ruta pública `/reset-password`
- `ProfilePage.tsx`: Botón "Cambiar contraseña" en el menú con modal de confirmación
- Email templates HTML en `email-templates/reset-password.html` y `email-templates/password-changed.html`
**Estado:** ⚠️ Parcial — Ocultado temporalmente por error en el flujo. UI removida de AuthPage y ProfilePage. Infraestructura (ResetPasswordPage, ruta, templates) se mantiene para reactivar cuando se resuelva.

### ✅ #5 — RLS: falta UPDATE policy en loyalty_cards para clientes
**Archivo:** Supabase RLS policies
**Problema:** Canje descuenta puntos con UPDATE, RLS bloquea silenciosamente.
**Fix:** `CREATE POLICY "Users can update own cards" ON loyalty_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
**Estado:** ✅ Completado

---

## 🟠 HIGH (7 issues)

### 🔴 #6 — Errores de Supabase fallan en silencio
**Archivos:** `HomePage.tsx`, `CardsPage.tsx`, `ProfilePage.tsx`, `NotificationsPage.tsx`
**Problema:** Queries fallidas hacen `console.error` y retornan array vacío. Usuario ve estado vacío idéntico a "sin datos".
**Fix:** Mostrar banner de error con botón "Reintentar" en vez de estado vacío.

### ✅ #7 — Botón de login sin estado de carga
**Archivos:** `AuthPage.tsx`
**Problema:** `isLoading` solo refleja carga inicial de sesión, no la petición de login en curso.
**Fix:** Agregado `loginLoading` + `registerLoading` locales con spinners animados en ambos botones (Sign In y Sign Up).
**Estado:** ✅ Completado

### ✅ #8 — Panel `demoMode` en producción
**Archivo:** `AuthPage.tsx`
**Problema:** Debug tool visible cuando hay rate limiting. Botón "Modo Demo" no crea cuenta real.
**Fix:** Eliminado completamente (estado, JSX, llamada `setDemoMode`).
**Estado:** ✅ Completado

### #9 — Sin verificación de email
**Archivos:** `AuthPage.tsx`, flujo de registro
**Problema:** Auto-login sin verificar `email_confirmed_at`.
**Fix:** Pantalla post-registro "Revisa tu correo" o banner en perfil.
**Nota:** Se exploró implementar con gate solo para registro de negocio pero se descartó. Pendiente para futuro.

### ✅ #10 — Fallback a usuario mock `sofia`
**Archivos:** `HomePage.tsx`, `ProfilePage.tsx`
**Problema:** `displayUser = user || sofia` — muestra datos mock si sesión no cargada.
**Fix:** Eliminado `sofia` y `displayUser`. Todo usa `user?.prop || ''` con null guards.
**Estado:** ✅ Completado

### ✅ #11 — Mensaje error teléfono inconsistente
**Archivos:** `AuthPage.tsx`, `AuthContext.tsx`, `ProfilePage.tsx`
**Problema:** Dice "7 dígitos", valida 10. Confunde al usuario.
**Fix:** "Completa los 7 dígitos después del prefijo." en los 3 archivos.
**Estado:** ✅ Completado

### #12 — Canje sin rollback en fallo parcial
**Archivo:** `CardDetailPage.tsx` `handleRedeem()`
**Problema:** Si falla el descuento de puntos, la redención queda huérfana.
**Fix:** Envolver en transacción SQL o revertir manualmente.

---

## 🟡 MEDIUM (8 issues)

### #13 — Modal sin accesibilidad
**Archivo:** `Modal.tsx`
**Problema:** Sin `aria-modal`, `role="dialog"`, focus trap, Escape key.
**Fix:** Agregar atributos ARIA y listeners.

### ✅ #14 — Sin animación de salida en toasts y modales
**Archivos:** `Modal.tsx`, `Toast.tsx`, `AppContext.tsx`, `index.css`
**Problema:** Desaparecen instantáneamente al cerrarse.
**Fix:** Keyframe `slide-down` en CSS. `closing` state en Modal. `removing` state en Toast vía AppContext. Animación de 250ms antes de desmontar.
**Estado:** ✅ Completado

### ✅ #15 — Sin notificaciones push en tiempo real
**Archivos:** `NotificationContext.tsx`, `NotificationToast.tsx`, `App.tsx`
**Problema:** Badge solo se actualiza al montar o visitar la página.
**Fix:** `supabase.channel()` escucha INSERT en `notifications`. Incrementa badge en vivo. `NotificationToast` muestra card flotante con título/mensaje/ícono + tap para abrir `NotificationDetailModal`. Auto-dismiss 5s.
**Estado:** ✅ Completado

### ✅ #16 — Tab "Perfil" activo sin diferenciación visual
**Archivo:** `BottomNav.tsx`
**Problema:** Avatar solo cambia opacity, sin anillo ni color.
**Fix:** `ring-2 ring-[#7546ED] ring-offset-1 rounded-full` cuando `isActive`.
**Estado:** ✅ Completado

### ✅ #17 — Nombre de negocio truncado sin tooltip
**Archivo:** `LoyaltyCard.tsx`
**Problema:** `truncate` sin `title` attribute.
**Fix:** `title={businessName}`.
**Estado:** ✅ Completado

### ✅ #18 — Posible doble `@` en username
**Archivos:** `AuthPage.tsx`
**Problema:** Si usuario pega `@ric`, resulta `@@ric`.
**Fix:** `signUpUsername.replace(/^@+/, '')` en el onChange del input.
**Estado:** ✅ Completado

### #19 — Sin protección de rutas por rol
**Archivo:** `App.tsx`
**Problema:** Cliente puede acceder a rutas de negocio vía `RoleSwitcher` debug tool.
**Nota:** El routing vía URL ya está protegido (`role === 'customer'` bloquea business routes). El `RoleSwitcher` es el único bypass.
**Fix:** Quitar `RoleSwitcher` de producción o agregar check de negocio activo.

### #20 — Sin indicador de fortaleza de contraseña
**Archivo:** `AuthPage.tsx` registro
**Problema:** Solo `length >= 6`, sin requisitos adicionales.
**Fix:** Validación adicional + barra visual.

---

## 🟢 LOW (6 issues)

### #21 — `EmptyState.tsx` sin uso real
**Archivo:** `src/components/EmptyState.tsx`
**Problema:** Muestra cajas de color, no acepta íconos. Ninguna página lo usa.
**Fix:** Mejorar con prop `icon` y unificar, o eliminar.

### #22 — `.single()` en vez de `.maybeSingle()`
**Archivo:** `CardDetailPage.tsx` líneas 75, 90
**Problema:** `.single()` lanza HTTP 406 con 0 filas.
**Fix:** Cambiar a `.maybeSingle()`.

### #23 — Categorías de negocio hardcodeadas
**Archivo:** `ProfilePage.tsx` líneas 500-507
**Problema:** `<select>` fijo en código.
**Fix:** Mover a constante compartida.

### #24 — Error en inglés en app en español
**Archivo:** `CardDetailPage.tsx` línea 364
**Problema:** `showToast('Failed to redeem reward', 'error')`.
**Fix:** Traducir a español.

### #25 — Sin refresh en notificaciones
**Archivo:** `NotificationsPage.tsx`
**Problema:** Sin forma de refrescar la lista.
**Fix:** Botón de refresh o pull-to-refresh.

### #26 — `navigate(-1)` sin fallback
**Archivo:** `CardDetailPage.tsx`
**Problema:** Si usuario llega directo por URL, lo saca de la app.
**Fix:** Fallback a `navigate('/cards')`.

---

## 🆕 NUEVOS — Bugs descubiertos y arreglados (post-audit)

### ✅ B1 — Negocio duplicado por race condition
**Archivo:** `ProfilePage.tsx`
**Problema:** Click rápido en "Registrar" antes de que cargue `userBusiness` permitía crear negocios duplicados.
**Fix:** Botón `disabled` mientras carga `businessCheckLoading`. Re-check en `handleCreateBusiness` antes de insertar.
**Estado:** ✅ Completado

### ✅ B2 — Redirect a Business Settings roto post-creación
**Archivo:** `ProfilePage.tsx`
**Problema:** `navigate('/business/settings')` después de crear negocio redirigía a `/home` porque `role` seguía siendo `customer`.
**Fix:** Eliminado el redirect. El usuario se queda en perfil viendo banner "Pendiente de aprobación".
**Estado:** ✅ Completado

### ✅ B3 — Flujo de verificación de email deshecho
**Archivo:** `ProfilePage.tsx`, `email-templates/`
**Problema:** Se implementó verificación de email con gate para negocio, pero se descartó por decisión de producto.
**Fix:** Eliminado modal de verificación, `supabaseUser` y estado `verifyEmailModal`. Templates guardados para futuro.
**Estado:** ✅ Completado (deshecho)

### ✅ B4 — Columna `profiles.user_id` eliminada
**Archivo:** Supabase (migración)
**Problema:** Columna redundante con 41 filas todas NULL, 0 usos en código.
**Fix:** `ALTER TABLE profiles DROP COLUMN IF EXISTS user_id`
**Estado:** ✅ Completado

### 🆕 B5 — Error en flujo de cambio de contraseña
**Archivos:** `AuthPage.tsx`, `ProfilePage.tsx`, `ResetPasswordPage.tsx`
**Problema:** `resetPasswordForEmail()` devuelve error al intentar cambiar contraseña. No se pudo diagnosticar la causa raíz.
**Acción:** UI oculta temporalmente en AuthPage ("¿Olvidaste tu contraseña?") y ProfilePage ("Cambiar contraseña"). Infraestructura (ResetPasswordPage, ruta, templates) se mantiene.
**Estado:** 🔧 Pendiente revisión. Requiere debug del flujo completo: Supabase Auth settings, `resetPasswordForEmail()`, callback `/reset-password`, `updateUser()`.

---

## Resumen final

| Prioridad | Cantidad | Completados | Pendientes |
|---|---|---|---|
| 🔴 Critical | 5 | ✅ #1, #5, ⚠️ #4 | ⏳ #2, #3 |
| 🟠 High | 7 | ✅ #7, #8, #10, #11 | #6, #9, #12 |
| 🟡 Medium | 8 | ✅ #14, #15, #16, #17, #18 | #13, #19, #20 |
| 🟢 Low | 6 | 0 | #21–#26 |
| 🆕 Bugs extras | 5 | ✅ B1–B4 | 🔧 B5 |
| **TOTAL** | **31** | **16** | **15** |
