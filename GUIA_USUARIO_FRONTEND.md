# 🎮 Guía de Usuario - Sistema de Optimización en Muscle RPG

## 📱 Cómo Usar la Aplicación

### 1. Inicio de Sesión y Perfil

**Paso 1**: Inicia sesión o regístrate en la aplicación

**Paso 2**: Completa tu perfil en `/setup`
- Nivel actual (Básico/Intermedio/Avanzado)
- Objetivos de entrenamiento
- Experiencia previa
- Disponibilidad semanal

⚠️ **Importante**: Debes completar el perfilamiento antes de generar rutinas. El sistema lo requiere para optimizar correctamente.

---

### 2. Generar Rutina Semanal Optimizada

#### Desde la Página de Rutinas (`/rutina`)

1. **Haz clic en "🚀 GENERAR RUTINA"**
   - El sistema muestra tu stamina disponible y nivel actual
   - Tiempo disponible: 120 minutos por sesión (configurable)

2. **Espera mientras el algoritmo calcula**
   - El sistema usa **Graph Greedy Algorithm** para optimizar
   - Considera restricciones de tiempo, stamina y balance muscular
   - Genera 7 días de rutinas (algunos pueden ser descanso)

3. **Visualiza tu rutina generada**
   - Verás un selector de días de la semana
   - Cada día muestra:
     - 💪 Número de ejercicios
     - 😴 Días de descanso
     - 🎯 Grupos musculares objetivo

---

### 3. Ver Métricas de Optimización

Una vez generada la rutina, haz clic en **"📊 Ver Métricas"**

#### Métricas Disponibles:

**1. Balance Muscular**
- Muestra qué tan equilibrada está la rutina
- Valor del 0% al 100%
- 100% = distribución perfecta entre grupos musculares
- Barra de progreso visual

**2. Ratio de Eficiencia**
- Fórmula: `XP / (Tiempo + Fatiga/10)`
- Indica cuán eficiente es cada ejercicio
- Valores más altos = mejor retorno por esfuerzo
- Ejemplo: Ratio de 4.2 es excelente

**3. Volume Landmarks**
- **MEV** (Minimum Effective Volume): Volumen mínimo para progreso
- **MAV** (Maximum Adaptive Volume): Volumen óptimo
- **MRV** (Maximum Recoverable Volume): Volumen máximo recuperable
- Valores ajustados según tu nivel

**4. Distribución por Ejercicio**
- Lista cada ejercicio con su grupo muscular principal
- Muestra el ratio de eficiencia individual
- Identifica ejercicios "estrella" vs menos eficientes

---

### 4. Planificación Trimestral (12 Semanas)

Haz clic en **"📈 Ver Ciclo Trimestral"**

#### ¿Qué es el Ciclo Trimestral?

El sistema usa **Programación Dinámica con Ecuación de Bellman** para planificar 12 semanas de entrenamiento optimizado.

#### Métricas del Ciclo:

**📊 XP Total Proyectado**
- Experiencia total que ganarás en 12 semanas
- Basado en adherencia esperada del 85%

**💪 Fatiga Final**
- Nivel de fatiga sistémica al final del ciclo
- Verde (< 50%): Excelente recuperación
- Rojo (> 70%): Necesitas más descanso

**✅ Adherencia Promedio**
- Porcentaje de rutinas que se espera completes
- Influye en el XP real obtenido

#### Tabla de Progresión Semanal:

| Columna | Descripción |
|---------|-------------|
| **Semana** | Número de semana (1-12) |
| **Volumen** | Series totales semanales |
| **Fatiga** | Nivel de fatiga sistémica (0-100%) |
| **Acción** | Decisión del algoritmo |
| **XP Ganada** | Experiencia obtenida esa semana |

#### Tipos de Acciones:

1. **⬆️ SOBRECARGA** (Verde)
   - Aumentar volumen 10%
   - Se aplica cuando la fatiga es manejable
   - Maximiza progreso

2. **➡️ MANTENER** (Azul)
   - Mantener volumen actual
   - Se aplica cuando estás en zona óptima
   - Consolida adaptaciones

3. **⬇️ DESCARGA** (Rojo/Amarillo)
   - Reducir a MEV (volumen mínimo)
   - Se aplica cuando fatiga > 60%
   - Necesario para recuperación

#### Gráfico de Volumen:

- Visualización de barras de la progresión
- Muestra picos y valles (microciclos)
- Semanas resaltadas en amarillo = Deload

---

### 5. Ejecutar la Rutina

#### Iniciar Entrenamiento

1. **Selecciona el día** usando los botones superiores
2. **Revisa los ejercicios** de ese día
3. **Haz clic en "💪 COMENZAR ENTRENAMIENTO"**

#### Durante el Entrenamiento

- Marca cada ejercicio como completado al hacerlo (clic en el ejercicio)
- Cronómetro muestra tiempo transcurrido
- Energía se descuenta automáticamente

#### Información por Ejercicio:

```
Bench Press
4×10 rep. • RIR 2 • ≈10 min • XP 60
🎯 chest, triceps
```

- **4×10**: 4 series de 10 repeticiones
- **RIR 2**: Deja 2 repeticiones en reserva
- **≈10 min**: Tiempo estimado (con descansos)
- **XP 60**: Experiencia que ganarás
- **🎯 chest, triceps**: Músculos trabajados

#### Finalizar

- Haz clic en **"Finalizar entrenamiento"**
- Ve tu resumen de ejercicios completados
- XP y stamina se actualizan automáticamente

---

### 6. Regenerar Rutina

Si quieres una rutina diferente:

1. Haz clic en **"🔄 Generar Nueva Rutina"**
2. El algoritmo genera una variación distinta
3. Mantiene las restricciones de balance y eficiencia

**Nota**: Cada regeneración puede producir rutinas ligeramente diferentes debido al factor de variabilidad del algoritmo.

---

## 🔧 Solución de Problemas

### "Debes completar tu perfil primero"

**Solución**: 
1. Ve a `/setup`
2. Completa todos los campos del formulario
3. Guarda tu perfil
4. Regresa a `/rutina`

### "No hay ejercicios disponibles"

**Solución**:
1. Contacta al administrador
2. Verifica que `data-exercises/exercises.json` esté poblado
3. Ejecuta el seed de la base de datos

### La rutina tiene muy pocos ejercicios

**Causas posibles**:
- Stamina muy baja (< 50)
- Restricciones muy estrictas
- Pocos ejercicios disponibles para tu nivel

**Solución**:
- Descansa para recuperar stamina
- Sube de nivel para desbloquear más ejercicios

### El ciclo trimestral no carga

**Verificar**:
1. Usuario autenticado correctamente
2. Perfil completado
3. Conexión con el backend activa
4. Revisar consola del navegador para errores

---

## 📊 Interpretación de Resultados

### Balance Muscular Alto (> 80%)

✅ **Excelente**: Rutina bien distribuida
- Bajo riesgo de sobreentrenamiento local
- Desarrollo equilibrado

### Balance Muscular Bajo (< 60%)

⚠️ **Advertencia**: Rutina desbalanceada
- Puede causar fatiga local excesiva
- Considera regenerar la rutina

### Ratio de Eficiencia

- **> 4.0**: Ejercicios muy eficientes
- **3.0 - 4.0**: Eficiencia buena
- **< 3.0**: Considerar alternativas

### Fatiga en Ciclo Trimestral

- **< 40%**: Puedes aumentar volumen
- **40-60%**: Zona óptima
- **60-80%**: Considera deload
- **> 80%**: Deload obligatorio

---

## 🎯 Consejos de Uso

### Para Principiantes (Básico)

1. ✅ Sigue la rutina generada sin modificaciones
2. ✅ Respeta los días de descanso
3. ✅ Enfócate en la técnica (RIR 3)
4. ✅ No excedas el MAV

### Para Intermedios

1. ✅ Puedes ajustar RIR a 2
2. ✅ Monitorea el balance muscular
3. ✅ Usa el ciclo trimestral para planificar
4. ✅ Acércate al MAV progresivamente

### Para Avanzados

1. ✅ RIR 0-1 (cerca del fallo)
2. ✅ Puedes llegar al MRV
3. ✅ Deloads más frecuentes
4. ✅ Monitorea fatiga de cerca

---

## 🚀 Flujo Completo Recomendado

```
1. Completar perfil → /setup
2. Generar rutina semanal → /rutina
3. Ver métricas de optimización → Botón "Ver Métricas"
4. Planificar trimestre → Botón "Ver Ciclo Trimestral"
5. Ejecutar día 1 → Seleccionar "Lunes" → Comenzar
6. Marcar ejercicios completados
7. Finalizar y ver resumen
8. Repetir para cada día de la semana
9. Cada semana, regenerar rutina si es necesario
10. Cada trimestre, reevaluar nivel y objetivos
```

---

## 📈 Progresión Esperada

### Semanas 1-4 (Adaptación)
- Volumen: MEV → 80% MAV
- Fatiga: Baja (20-40%)
- XP/semana: 350-450

### Semanas 5-8 (Sobrecarga)
- Volumen: 80% MAV → MRV
- Fatiga: Media (40-70%)
- XP/semana: 450-550
- **Deload en semana 7-8**

### Semanas 9-12 (Consolidación)
- Volumen: MEV → MAV
- Fatiga: Baja-Media (30-50%)
- XP/semana: 400-500
- **Deload final en semana 12**

**Total en 12 semanas**: ~1500-1800 XP

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo modificar los ejercicios manualmente?**
R: Actualmente no. El algoritmo optimiza automáticamente. En futuras versiones se permitirá personalización.

**P: ¿Por qué algunos días no tienen ejercicios?**
R: Son días de descanso programados. Respetarlos es crucial para la recuperación.

**P: ¿El ciclo trimestral se actualiza automáticamente?**
R: No. Debes recalcularlo cada trimestre o cuando cambies de nivel.

**P: ¿Qué pasa si no completo todos los ejercicios?**
R: El XP se ajusta proporcionalmente. La adherencia afecta la planificación futura.

**P: ¿Puedo usar la app sin internet?**
R: No actualmente. Se requiere conexión con el backend.

---

**Versión**: 2.0  
**Fecha**: Diciembre 2025  
**Soporte**: [GitHub Issues](https://github.com/tu-repo/muscle-rpg/issues)
