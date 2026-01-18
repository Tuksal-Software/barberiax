export async function getActiveServices(): Promise<{ success: boolean; data: any[]; error?: string }> {
  return { success: true, data: [] }
}

export async function getServices(): Promise<{ success: boolean; data: any[]; error?: string }> {
  return { success: true, data: [] }
}

export async function createService(input: { name: string; description?: string; duration: number; price: number; category?: string; isActive?: boolean }): Promise<{ success: boolean; data?: any; error?: string }> {
  return { success: false, error: 'Service model not implemented' }
}

export async function updateService(id: string, input: Partial<{ name: string; description: string; duration: number; price: number; category: string; isActive: boolean }>): Promise<{ success: boolean; data?: any; error?: string }> {
  return { success: false, error: 'Service model not implemented' }
}

export async function reorderServices(idsInOrder: string[]): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Service model not implemented' }
}

export async function deleteService(id: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Service model not implemented' }
}


