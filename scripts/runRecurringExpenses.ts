import { prisma } from '@/lib/prisma'
import { getNowUTC } from '@/lib/time'
import { auditLog } from '@/lib/audit/audit.logger'
import { AuditAction } from '@prisma/client'
import { addDays, addWeeks, addMonths, format, parseISO } from 'date-fns'
import { Prisma } from '@prisma/client'

function calculateNextRunAt(
  currentNextRunAt: Date,
  repeatType: 'daily' | 'weekly' | 'monthly',
  repeatInterval: number
): Date {
  if (repeatType === 'daily') {
    return addDays(currentNextRunAt, repeatInterval)
  } else if (repeatType === 'weekly') {
    return addWeeks(currentNextRunAt, repeatInterval)
  } else {
    return addMonths(currentNextRunAt, repeatInterval)
  }
}

async function main() {
  console.log('[Recurring Expenses] Script başlatılıyor...')
  
  const now = getNowUTC()
  console.log(`[Recurring Expenses] Şu anki zaman (TR): ${now.toISOString()}`)
  
  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: {
      isActive: true,
      nextRunAt: {
        lte: now,
      },
    },
  })
  
  console.log(`[Recurring Expenses] Toplam ${recurringExpenses.length} aktif tekrarlayan gider bulundu`)
  
  let processedCount = 0
  let expenseCreatedCount = 0
  let errors = 0
  
  for (const recurringExpense of recurringExpenses) {
    try {
      const expenseDate = format(recurringExpense.nextRunAt, 'yyyy-MM-dd')
      
      if (recurringExpense.endDate) {
        const endDate = parseISO(recurringExpense.endDate)
        const nextRunDate = recurringExpense.nextRunAt
        
        if (nextRunDate > endDate) {
          console.log(`[Recurring Expenses] Bitiş tarihi geçmiş, atlandı: ${recurringExpense.id}`)
          await prisma.recurringExpense.update({
            where: { id: recurringExpense.id },
            data: { isActive: false },
          })
          processedCount++
          continue
        }
      }
      
      await prisma.expense.create({
        data: {
          date: expenseDate,
          amount: new Prisma.Decimal(recurringExpense.amount.toString()),
          category: recurringExpense.category,
          description: recurringExpense.title,
          sourceType: 'recurring',
          sourceId: recurringExpense.id,
          tenantId: recurringExpense.tenantId,
        },
      })
      
      expenseCreatedCount++
      
      const nextRunAt = calculateNextRunAt(
        recurringExpense.nextRunAt,
        recurringExpense.repeatType,
        recurringExpense.repeatInterval
      )
      
      await prisma.recurringExpense.update({
        where: { id: recurringExpense.id },
        data: { nextRunAt },
      })
      
      try {
        await auditLog({
          actorType: 'system',
          action: AuditAction.RECURRING_EXPENSE_RUN,
          entityType: 'expense',
          entityId: recurringExpense.id,
          summary: `Recurring expense run: ${recurringExpense.title}`,
          metadata: {
            recurringExpenseId: recurringExpense.id,
            expenseDate,
            amount: recurringExpense.amount.toString(),
            category: recurringExpense.category,
            nextRunAt: nextRunAt.toISOString(),
          },
        })
      } catch (auditError) {
        console.error(`[Recurring Expenses] Audit log hatası (${recurringExpense.id}):`, auditError)
      }
      
      processedCount++
      console.log(`[Recurring Expenses] Gider oluşturuldu ve nextRunAt güncellendi: ${recurringExpense.id}`)
    } catch (error) {
      errors++
      console.error(`[Recurring Expenses] Hata (${recurringExpense.id}):`, error)
    }
  }
  
  console.log('\n[Recurring Expenses] Özet:')
  console.log(`  - İşlenen kayıt sayısı: ${processedCount}`)
  console.log(`  - Oluşturulan gider sayısı: ${expenseCreatedCount}`)
  console.log(`  - Hata sayısı: ${errors}`)
  
  try {
    await prisma.systemJobLog.create({
      data: {
        jobName: 'recurring_expenses_runner',
        ranAt: now,
        meta: {
          processedCount,
          expenseCreatedCount,
          errors,
        },
      },
    })
    console.log('[Recurring Expenses] Job log kaydedildi')
  } catch (logError) {
    console.error('[Recurring Expenses] Job log kaydedilemedi:', logError)
  }
  
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('[Recurring Expenses] Kritik hata:', error)
  process.exit(1)
})
