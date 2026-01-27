'use server'

import { prisma } from '@/lib/prisma'
import { parseTimeToMinutes, minutesToTime, overlaps } from '@/lib/time'
import { getNowUTC } from '@/lib/time'
import { getTenantFilter } from '@/lib/db-helpers'

export interface AvailableTimeSlot {
    startTime: string
    endTime: string
}

export interface GetAvailableTimeSlotsParams {
    barberId: string
    date: string
}

export async function getAvailableTimeSlotsV2(
    params: GetAvailableTimeSlotsParams
): Promise<AvailableTimeSlot[]> {
    const { barberId, date } = params

    if (!barberId || !date) {
        throw new Error('Berber ID ve tarih gereklidir')
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
        throw new Error('Geçersiz tarih formatı')
    }

    const dayOfWeek = dateObj.getDay()

    const tenantFilter = await getTenantFilter()
    const barber = await prisma.barber.findUnique({
        where: { 
            id: barberId,
            ...tenantFilter,
        },
        select: { slotDuration: true, isActive: true },
    })

    if (!barber) {
        throw new Error('Berber bulunamadı')
    }

    if (!barber.isActive) {
        throw new Error('Berber aktif değil')
    }

    const workingHour = await prisma.workingHour.findUnique({
        where: {
            barberId_dayOfWeek: {
                barberId,
                dayOfWeek,
            },
        },
    })

    if (!workingHour) {
        return []
    }

    const slotDuration = barber.slotDuration
    const workStartMinutes = parseTimeToMinutes(workingHour.startTime)
    const workEndMinutes = parseTimeToMinutes(workingHour.endTime)

    const [blockedSlots, overrides] = await Promise.all([
        prisma.appointmentSlot.findMany({
            where: {
                barberId,
                date,
                status: 'blocked',
                ...tenantFilter,
            },
            select: {
                startTime: true,
                endTime: true,
            },
        }),
        prisma.workingHourOverride.findMany({
            where: {
                barberId,
                date,
                ...tenantFilter,
            },
            select: {
                startTime: true,
                endTime: true,
            },
        }),
    ])

    const availableSlots: AvailableTimeSlot[] = []
    const now = getNowUTC()
    const isToday = date === now.toISOString().split('T')[0]
    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1

    let currentSlotStart = workStartMinutes

    while (currentSlotStart + slotDuration <= workEndMinutes) {
        const currentSlotEnd = currentSlotStart + slotDuration
        const slotStartTime = minutesToTime(currentSlotStart)
        const slotEndTime = minutesToTime(currentSlotEnd)

        if (isToday && currentSlotStart < currentMinutes) {
            currentSlotStart += slotDuration
            continue
        }

        let isBlocked = false
        for (const blockedSlot of blockedSlots) {
            if (overlaps(slotStartTime, slotEndTime, blockedSlot.startTime, blockedSlot.endTime)) {
                isBlocked = true
                break
            }
        }

        if (!isBlocked) {
            for (const override of overrides) {
                if (overlaps(slotStartTime, slotEndTime, override.startTime, override.endTime)) {
                    isBlocked = true
                    break
                }
            }
        }

        if (!isBlocked) {
            availableSlots.push({
                startTime: slotStartTime,
                endTime: slotEndTime,
            })
        }

        currentSlotStart += slotDuration
    }

    return availableSlots
}

export interface CustomerTimeButton {
    time: string
    disabled: boolean
}

export interface GetCustomerTimeButtonsParams {
    barberId: string
    date: string
    durationMinutes: number
    enableServiceSelection?: boolean
}

export async function getCustomerTimeButtonsV2(
    params: GetCustomerTimeButtonsParams
): Promise<CustomerTimeButton[]> {
    const { barberId, date, durationMinutes, enableServiceSelection = true } = params

    if (!barberId || !date || !durationMinutes) {
        throw new Error('Berber ID, tarih ve süre gereklidir')
    }

    if (durationMinutes !== 30 && durationMinutes !== 60) {
        throw new Error('Süre 30 veya 60 dakika olmalıdır')
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
        throw new Error('Geçersiz tarih formatı')
    }

    const dayOfWeek = dateObj.getDay()

    const tenantFilter = await getTenantFilter()
    const barber = await prisma.barber.findUnique({
        where: { 
            id: barberId,
            ...tenantFilter,
        },
        select: { isActive: true },
    })

    if (!barber) {
        throw new Error('Berber bulunamadı')
    }

    if (!barber.isActive) {
        throw new Error('Berber aktif değil')
    }

    const workingHour = await prisma.workingHour.findUnique({
        where: {
            barberId_dayOfWeek: {
                barberId,
                dayOfWeek,
            },
        },
    })

    if (!workingHour) {
        return []
    }

    const workStartMinutes = parseTimeToMinutes(workingHour.startTime)
    const workEndMinutes = parseTimeToMinutes(workingHour.endTime)

    const [pendingOrApprovedRequests, appointmentSlots, overrides] = await Promise.all([
        prisma.appointmentRequest.findMany({
            where: {
                barberId,
                date,
                status: {
                    in: ['pending', 'approved'],
                },
                ...tenantFilter,
            },
            select: {
                requestedStartTime: true,
                appointmentSlots: {
                    select: {
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        }),
        prisma.appointmentSlot.findMany({
            where: {
                barberId,
                date,
                status: 'blocked',
                ...tenantFilter,
            },
            select: {
                startTime: true,
                endTime: true,
            },
        }),
        prisma.workingHourOverride.findMany({
            where: {
                barberId,
                date,
                ...tenantFilter,
            },
            select: {
                startTime: true,
                endTime: true,
            },
        }),
    ])

    const now = getNowUTC()
    const isToday = date === now.toISOString().split('T')[0]
    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1
    const minAllowedMinutes = currentMinutes + 180

    const timeButtons = new Map<string, boolean>()

    if (durationMinutes === 30) {
        for (let hour = Math.floor(workStartMinutes / 60); hour <= Math.floor(workEndMinutes / 60); hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeMinutes = hour * 60 + minute
                if (timeMinutes >= workStartMinutes && timeMinutes < workEndMinutes) {
                    const timeStr = minutesToTime(timeMinutes)
                    timeButtons.set(timeStr, false)
                }
            }
        }
    } else if (durationMinutes === 60) {
        for (let hour = Math.floor(workStartMinutes / 60); hour <= Math.floor(workEndMinutes / 60); hour++) {
            const timeMinutes = hour * 60
            if (timeMinutes >= workStartMinutes && timeMinutes < workEndMinutes) {
                const timeStr = minutesToTime(timeMinutes)
                timeButtons.set(timeStr, false)
            }
        }
    }

    const allBlockedRanges: Array<{ start: number; end: number }> = []

    for (const request of pendingOrApprovedRequests) {
        const requestStartMinutes = parseTimeToMinutes(request.requestedStartTime)

        if (request.appointmentSlots.length > 0) {
            for (const slot of request.appointmentSlots) {
                const slotStart = parseTimeToMinutes(slot.startTime)
                const slotEnd = parseTimeToMinutes(slot.endTime)
                allBlockedRanges.push({ start: slotStart, end: slotEnd })
            }
        } else {
            const requestEndMinutes = requestStartMinutes + 30
            allBlockedRanges.push({ start: requestStartMinutes, end: requestEndMinutes })
        }
    }

    for (const slot of appointmentSlots) {
        const slotStart = parseTimeToMinutes(slot.startTime)
        const slotEnd = parseTimeToMinutes(slot.endTime)
        allBlockedRanges.push({ start: slotStart, end: slotEnd })
    }

    for (const override of overrides) {
        const overrideStart = parseTimeToMinutes(override.startTime)
        const overrideEnd = parseTimeToMinutes(override.endTime)
        allBlockedRanges.push({ start: overrideStart, end: overrideEnd })
    }

    if (durationMinutes === 30) {
        const gapButtons = new Set<string>()

        for (const slot of appointmentSlots) {
            const slotStart = parseTimeToMinutes(slot.startTime)
            const slotEnd = parseTimeToMinutes(slot.endTime)
            const gapStart = slotEnd
            const gapEnd = gapStart + 30

            if (gapStart < workEndMinutes) {
                let hasOverlap = false

                for (const otherSlot of appointmentSlots) {
                    const otherStart = parseTimeToMinutes(otherSlot.startTime)
                    const otherEnd = parseTimeToMinutes(otherSlot.endTime)

                    if (otherStart < gapEnd && otherEnd > gapStart) {
                        hasOverlap = true
                        break
                    }
                }

                if (!hasOverlap) {
                    const gapTimeStr = minutesToTime(gapStart)
                    gapButtons.add(gapTimeStr)
                }
            }
        }

        for (const gapTime of gapButtons) {
            if (!timeButtons.has(gapTime)) {
                timeButtons.set(gapTime, false)
            }
        }
    } else if (durationMinutes === 60) {
        const gapButtons = new Set<string>()

        for (const slot of appointmentSlots) {
            const slotStart = parseTimeToMinutes(slot.startTime)
            const slotEnd = parseTimeToMinutes(slot.endTime)
            const slotDuration = slotEnd - slotStart

            if (slotDuration === 30 || slotDuration === 60) {
                const gapStart = slotEnd
                const gapEnd = gapStart + 30

                if (gapStart >= workStartMinutes && gapEnd <= workEndMinutes) {
                    let hasOverlap = false

                    for (const range of allBlockedRanges) {
                        if (range.start < gapEnd && range.end > gapStart) {
                            hasOverlap = true
                            break
                        }
                    }

                    if (!hasOverlap) {
                        const gapTimeStr = minutesToTime(gapStart)
                        gapButtons.add(gapTimeStr)
                    }
                }
            }
        }

        for (const gapTime of gapButtons) {
            if (!timeButtons.has(gapTime)) {
                timeButtons.set(gapTime, false)
            }
        }
    }

    const result: CustomerTimeButton[] = []

    for (const [timeStr, _] of timeButtons) {
        const timeMinutes = parseTimeToMinutes(timeStr)

        if (isToday && timeMinutes < minAllowedMinutes) {
            continue
        }

        const buttonWindowStart = timeMinutes
        const buttonWindowEnd = timeMinutes + durationMinutes

        let isDisabled = false

        for (const range of allBlockedRanges) {
            if (range.start < buttonWindowEnd && range.end > buttonWindowStart) {
                isDisabled = true
                break
            }
        }

        result.push({
            time: timeStr,
            disabled: isDisabled,
        })
    }

    result.sort((a, b) => {
        const aMinutes = parseTimeToMinutes(a.time)
        const bMinutes = parseTimeToMinutes(b.time)
        return aMinutes - bMinutes
    })

    return result
}