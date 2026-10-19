package cmd

import (
	"gateway/core/logging"
	"log"
)

func InitConfig() {
	errs := logging.Init()
	if len(errs) >=1  {
		log.Fatal("Lỗi cấu hình Logger")
		 for _, err := range errs {
			log.Fatal("Lỗi cấu hình cho ", err)
		}
	}
}
