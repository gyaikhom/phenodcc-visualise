/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import javax.xml.bind.annotation.XmlElement;

/**
 * The structure of centre activity data that is returned by the
 * CentreFacadeREST web service.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
public class ActivityData {

    private Short cid;
    private Integer year;
    private Integer month;
    private Integer week;
    private Long numXmlFiles;

    public ActivityData(Short cid, Integer year, Integer month,
            Integer week, Long numXmlFiles) {
        this.cid = cid;
        this.year = year;
        this.month = month;
        this.week = week;
        this.numXmlFiles = numXmlFiles;
    }

    @XmlElement(name = "c")
    public Short getCid() {
        return cid;
    }

    public void setCid(Short cid) {
        this.cid = cid;
    }

    @XmlElement(name = "y")
    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    @XmlElement(name = "m")
    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    @XmlElement(name = "w")
    public Integer getWeek() {
        return week;
    }

    public void setWeek(Integer week) {
        this.week = week;
    }

    @XmlElement(name = "n")
    public Long getNumXmlFiles() {
        return numXmlFiles;
    }

    public void setNumXmlFiles(Long numXmlFiles) {
        this.numXmlFiles = numXmlFiles;
    }
}
