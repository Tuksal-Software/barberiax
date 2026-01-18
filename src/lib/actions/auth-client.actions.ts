'use server'

import { getSession } from './auth.actions'

export async function getSessionClient() {
  return await getSession()
}






