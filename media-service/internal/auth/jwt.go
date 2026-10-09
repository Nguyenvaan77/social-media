package auth

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var ErrUnauthorized = errors.New("unauthorized")

// Verifier validates access tokens issued for the media service.
type Verifier struct {
	secret []byte
	parser *jwt.Parser
}

func NewVerifier(secret, issuer, audience string) (*Verifier, error) {
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT secret must be at least 32 bytes")
	}

	options := []jwt.ParserOption{
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
	}
	if issuer != "" {
		options = append(options, jwt.WithIssuer(issuer))
	}
	if audience != "" {
		options = append(options, jwt.WithAudience(audience))
	}

	return &Verifier{
		secret: []byte(secret),
		parser: jwt.NewParser(options...),
	}, nil
}

// UserID returns the positive decimal user ID in a valid token's subject.
func (v *Verifier) UserID(rawToken string) (int, error) {
	if v == nil || v.parser == nil || strings.TrimSpace(rawToken) == "" {
		return 0, ErrUnauthorized
	}

	claims := &jwt.RegisteredClaims{}
	token, err := v.parser.ParseWithClaims(rawToken, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, ErrUnauthorized
		}
		return v.secret, nil
	})
	if err != nil || token == nil || !token.Valid {
		return 0, ErrUnauthorized
	}

	subject := claims.Subject
	if subject == "" {
		return 0, ErrUnauthorized
	}
	for _, ch := range subject {
		if ch < '0' || ch > '9' {
			return 0, ErrUnauthorized
		}
	}
	userID, err := strconv.Atoi(subject)
	if err != nil || userID <= 0 || userID > math.MaxInt32 {
		return 0, ErrUnauthorized
	}
	return userID, nil
}
