package enum

// Permission identifies a permission stored in the auth database.
type Permission string

const (
	PermissionUserCreate Permission = "user.create"
	PermissionUserRead   Permission = "user.read"
	PermissionUserUpdate Permission = "user.update"
	PermissionUserDelete Permission = "user.delete"
	PermissionPostCreate Permission = "post.create"
	PermissionPostRead   Permission = "post.read"
	PermissionPostUpdate Permission = "post.update"
	PermissionPostDelete Permission = "post.delete"
)

func (permission Permission) String() string { return string(permission) }
