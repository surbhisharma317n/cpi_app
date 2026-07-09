import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UserState {
  name: string
  role: string
}

const initialState: UserState = {
  name: 'Amit',
  role: 'Data Analyst',
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateName(state, action: PayloadAction<string>) {
      state.name = action.payload
    },
  },
})

export const { updateName } = userSlice.actions
export default userSlice.reducer
