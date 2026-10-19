package enum

// Role identifies a role stored in the auth database.
type Role string

const (
	RoleUser       Role = "user"
	RoleAdmin      Role = "admin"
	RoleGroupAdmin Role = "admin-group"
)

func (role Role) String() string { return string(role) }
