package enum

// Permission identifies a permission stored in the auth database.
type AccountStatus string

const (
	ENABLE AccountStatus = "enable"
	DISABLE   AccountStatus = "disable"
)

func (accountStatus AccountStatus) String() string { return string(accountStatus) }
