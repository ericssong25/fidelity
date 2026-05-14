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

### ✅ #4 — Sin flujo de "Olvidé mi contraseña"
**Archivo:** `AuthPage.tsx`, `ResetPasswordPage.tsx`, `App.tsx`, `ProfilePage.tsx`
**Problema:** Sin `resetPasswordForEmail`. Usuario bloqueado si olvida contraseña.
**Fix:**
- `AuthPage.tsx`: Agregado link "¿Olvidaste tu contraseña?" en Sign In → input email → `resetPasswordForEmail()` → toast confirmación
- `ResetPasswordPage.tsx`: Nuevo — recibe token vía URL, formulario nueva contraseña + confirmación, llama `updateUser({ password })`
- `App.tsx`: Agregada ruta pública `/reset-password`
- `ProfilePage.tsx`: Agregado botón "Cambiar contraseña" en el menú → envía email directo al usuario autenticado
- Email template HTML personalizado con paleta Zuma para Supabase Dashboard
**Estado:** ✅ Completado

### ✅ #5 — RLS: falta UPDATE policy en loyalty_cards para clientes
**Archivo:** Supabase RLS policies
**Problema:** Canje descuenta puntos con UPDATE, RLS lo bloquea silenciosamente.
**Fix:** `CREATE POLICY "Users can update own cards" ON loyalty_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
**Estado:** ✅ Completado

---

## 🟠 HIGH (7 issues)

### #6 — Errores de Supabase fallan en silencio
**Archivos:** `HomePage.tsx`, `CardsPage.tsx`, `ProfilePage.tsx`, `NotificationsPage.tsx`
**Problema:** Queries fallidas hacen `console.error` y retornan array vacío. Usuario ve estado vacío idéntico a "sin datos".
**Fix:** Mostrar banner de error con botón "Reintentar" en vez de estado vacío.

### #7 — Botón de login sin estado de carga
**Archivos:** `AuthPage.tsx` + `AuthContext.tsx`
**Problema:** `isLoading` solo refleja carga inicial de sesión, no la petición de login en curso.
**Fix:** Agregar estado `loginLoading` local en `AuthPage`.

### #8 — Panel `demoMode` en producción
**Archivo:** `AuthPage.tsx` líneas 342-372
**Problema:** Debug tool visible cuando hay rate limiting. Botón "Modo Demo" no crea cuenta real.
**Fix:** Quitar de producción o feature-flag con variable de entorno.

### #9 — Sin verificación de email
**Archivos:** `AuthPage.tsx`, flujo de registro
**Problema:** Auto-login sin verificar `email_confirmed_at`. Nunca se le pide al usuario verificar.
**Fix:** Pantalla post-registro "Revisa tu correo" o banner en perfil.

### #10 — Fallback a usuario mock `sofia`
**Archivos:** `HomePage.tsx` línea 53, `ProfilePage.tsx` línea 53
**Problema:** `displayUser = user || sofia` — muestra datos mock si sesión no cargada.
**Fix:** Mostrar skeleton loader mientras `user` es null.

### #11 — Mensaje error teléfono inconsistente
**Archivos:** `AuthPage.tsx` línea 82, `AuthContext.tsx` línea 260-262
**Problema:** Dice "7 dígitos", valida 10. Confunde al usuario.
**Fix:** "El número de teléfono no es válido. Debe tener 7 dígitos después del prefijo."

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

### #14 — Sin animación de salida en toasts y modales
**Archivos:** `Modal.tsx`, `Toast.tsx`
**Problema:** Desaparecen instantáneamente al cerrarse.
**Fix:** CSS transitions con timer antes de desmontar.

### #15 — Sin notificaciones push en tiempo real
**Archivo:** `NotificationContext.tsx`
**Problema:** Badge solo se actualiza al montar o visitar la página.
**Fix:** `supabase.channel()` para suscripción real-time.

### #16 — Tab "Perfil" activo sin diferenciación visual
**Archivo:** `BottomNav.tsx` línea 41-43
**Problema:** Avatar solo cambia opacity, sin anillo ni color.
**Fix:** Agregar `ring-2 ring-[#7546ED]` al avatar activo.

### #17 — Nombre de negocio truncado sin tooltip
**Archivo:** `LoyaltyCard.tsx` línea 68
**Problema:** `truncate` sin `title` attribute.
**Fix:** `title={businessName}`.

### #18 — Posible doble `@` en username
**Archivos:** `AuthPage.tsx` línea 106, `AuthContext.tsx`
**Problema:** Si usuario escribe `@`, resulta `@@usuario`.
**Fix:** `signUpUsername.replace(/^@+/, '')`.

### #19 — Sin protección de rutas por rol
**Archivo:** `App.tsx`
**Problema:** Cliente puede escribir `/business/overview` y acceder.
**Fix:** Redirect basado en rol en `AuthenticatedRoutes`.

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

## Resumen

| Prioridad | Cantidad | Completados |
|---|---|---|
| 🔴 Critical | 5 | ✅ #1, #4, #5 (3/5) |
| 🟠 High | 7 | 0 |
| 🟡 Medium | 8 | 0 |
| 🟢 Low | 6 | 0 |
