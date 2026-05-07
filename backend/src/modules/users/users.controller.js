import { catchAsync } from '../../utils/catchAsync.js'
import * as usersService from './users.service.js'

export const list = catchAsync(async (req, res) => {
  const users = await usersService.listUsers()
  res.json({ success: true, data: users })
})

export const getById = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.params.id)
  res.json({ success: true, data: user })
})
