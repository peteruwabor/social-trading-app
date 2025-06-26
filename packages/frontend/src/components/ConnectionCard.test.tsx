import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConnectionCard from './ConnectionCard'

// Mock the hooks
jest.mock('@/lib/hooks/useConnections', () => ({
  useDeleteConnection: () => ({
    mutateAsync: jest.fn(),
    isPending: false
  })
}))

const mockConnection = {
  id: '1',
  userId: 'user1',
  broker: 'snaptrade',
  status: 'active' as const,
  health: 'green' as const,
  lastSyncedAt: '2024-01-01T12:00:00Z',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z'
}

describe('ConnectionCard', () => {
  it('renders connection information correctly', () => {
    render(<ConnectionCard connection={mockConnection} />)
    
    expect(screen.getByText('SnapTrade')).toBeInTheDocument()
    expect(screen.getByText(/Connected/)).toBeInTheDocument()
    expect(screen.getByText(/Last synced/)).toBeInTheDocument()
  })

  it('shows delete modal when trash icon is clicked', () => {
    render(<ConnectionCard connection={mockConnection} />)
    
    const deleteButton = screen.getByLabelText('Disconnect broker')
    fireEvent.click(deleteButton)
    
    expect(screen.getByText('Disconnect SnapTrade?')).toBeInTheDocument()
  })
}) 