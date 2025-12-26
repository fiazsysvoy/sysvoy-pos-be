import { Request, Response } from 'express'
import { AuthService } from './auth.service.js'

const authService = new AuthService()

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await authService.signup(email, password)
    res.status(201).json(user)
  } catch (err: any) {
    res.status(400).json({ message: err.message })
  }
}

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const data = await authService.signin(email, password)
    res.json(data)
  } catch (err: any) {
    res.status(401).json({ message: err.message })
  }
}
